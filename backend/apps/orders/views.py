from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, DecimalField, Q, Sum
from django.db.models.functions import Coalesce
from django.http import HttpResponseRedirect
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.generics import (
    ListAPIView,
    ListCreateAPIView,
    RetrieveAPIView,
    RetrieveUpdateAPIView,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Address, Coupon, Order, OrderItem
from .payments import (
    payment_result_url,
    start_zarinpal_payment,
    verify_zarinpal_payment,
)
from .permissions import IsPlatformAdmin
from .serializers import (
    AddressSerializer,
    AdminOrderSerializer,
    CheckoutSerializer,
    CouponSerializer,
    OrderDetailSerializer,
    OrderSerializer,
    OrderStatusUpdateSerializer,
)
from .services import create_order_from_cart, transition_order_status


class AddressListCreateAPIView(ListCreateAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = AddressSerializer
    pagination_class = None

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        with transaction.atomic():
            get_user_model().objects.select_for_update().get(pk=self.request.user.pk)
            if serializer.validated_data.get("is_default"):
                Address.objects.filter(user=self.request.user, is_default=True).update(
                    is_default=False
                )
            serializer.save(user=self.request.user)


class OrderListAPIView(ListAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = OrderSerializer

    def get_queryset(self):
        queryset = Order.objects.filter(user=self.request.user).prefetch_related(
            "items__product__images", "status_events__changed_by"
        )
        requested_status = self.request.query_params.get("status", "").strip()
        if requested_status:
            valid_statuses = {choice for choice, _ in Order.Status.choices}
            if requested_status not in valid_statuses:
                raise ValidationError({"status": "Invalid order status."})
            queryset = queryset.filter(status=requested_status)
        return queryset


class OrderDetailAPIView(RetrieveAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = OrderDetailSerializer
    lookup_field = "order_code"
    lookup_url_kwarg = "order_code"

    def get_queryset(self):
        queryset = Order.objects.select_related("user").prefetch_related(
            "items__product__images",
            "status_events__changed_by",
            "payment_attempts",
        )
        if self.request.user.is_admin and self.request.user.is_staff:
            return queryset
        return queryset.filter(user=self.request.user)


class CustomerOrderSummaryAPIView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        by_status = {status: 0 for status, _ in Order.Status.choices}
        for item in (
            Order.objects.filter(user=request.user)
            .values("status")
            .annotate(count=Count("id"))
        ):
            by_status[item["status"]] = item["count"]
        return Response({"total": sum(by_status.values()), "by_status": by_status})


class AdminOrderListAPIView(ListAPIView):
    permission_classes = (IsPlatformAdmin,)
    serializer_class = AdminOrderSerializer

    def get_queryset(self):
        queryset = Order.objects.select_related("user").prefetch_related(
            "items__product__images", "status_events__changed_by"
        )
        requested_status = self.request.query_params.get("status", "").strip()
        if requested_status:
            valid_statuses = {choice for choice, _ in Order.Status.choices}
            if requested_status not in valid_statuses:
                raise ValidationError({"status": "Invalid order status."})
            queryset = queryset.filter(status=requested_status)

        query = self.request.query_params.get("query", "").strip()
        if query:
            queryset = queryset.filter(
                Q(number__icontains=query)
                | Q(order_code__icontains=query)
                | Q(user__phone__icontains=query)
            )
        return queryset


class AdminCouponListCreateAPIView(ListCreateAPIView):
    permission_classes = (IsPlatformAdmin,)
    serializer_class = CouponSerializer
    queryset = Coupon.objects.all()
    pagination_class = None


class AdminCouponDetailAPIView(RetrieveUpdateAPIView):
    permission_classes = (IsPlatformAdmin,)
    serializer_class = CouponSerializer
    queryset = Coupon.objects.all()


class AdminOrderSummaryAPIView(APIView):
    permission_classes = (IsPlatformAdmin,)

    def get(self, request):
        by_status = {status: 0 for status, _ in Order.Status.choices}
        for item in Order.objects.values("status").annotate(count=Count("id")):
            by_status[item["status"]] = item["count"]
        completed = Order.objects.filter(
            status__in=(
                Order.Status.PAID,
                Order.Status.PROCESSING,
                Order.Status.SHIPPED,
            )
        )
        revenue = completed.aggregate(
            total=Coalesce(Sum("total"), 0, output_field=DecimalField())
        )["total"]
        best_sellers = (
            OrderItem.objects.filter(order__in=completed)
            .values("product_sku", "product_name")
            .annotate(quantity=Sum("quantity"))
            .order_by("-quantity", "product_name")[:5]
        )
        return Response(
            {
                "total": sum(by_status.values()),
                "by_status": by_status,
                "revenue": revenue,
                "completed_orders": completed.count(),
                "best_sellers": list(best_sellers),
            }
        )


class AdminOrderStatusAPIView(APIView):
    permission_classes = (IsPlatformAdmin,)

    def patch(self, request, order_number):
        serializer = OrderStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = Order.objects.filter(number=order_number).first()
        if order is None:
            raise NotFound("Order not found.")
        for field in ("carrier", "tracking_number"):
            if field in serializer.validated_data:
                setattr(order, field, serializer.validated_data[field])
        if (
            "carrier" in serializer.validated_data
            or "tracking_number" in serializer.validated_data
        ):
            order.save(update_fields=["carrier", "tracking_number", "updated_at"])
        order = transition_order_status(
            order_number=order_number,
            target_status=serializer.validated_data["status"],
            changed_by=request.user,
        )
        return Response(AdminOrderSerializer(order).data)


class CheckoutAPIView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = create_order_from_cart(user=request.user, **serializer.validated_data)
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class StartPaymentAPIView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, order_number):
        payment = start_zarinpal_payment(user=request.user, order_number=order_number)
        return Response(
            {
                "order_number": payment.order.number,
                "authorization_url": payment.authorization_url,
            },
            status=status.HTTP_201_CREATED,
        )


class ZarinpalCallbackAPIView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = ()

    def get(self, request):
        authority = request.query_params.get("Authority", "")
        gateway_status = request.query_params.get("Status")
        if not authority or gateway_status != "OK":
            return HttpResponseRedirect(
                payment_result_url(status="failed", order_number="unknown")
            )
        try:
            payment = verify_zarinpal_payment(authority=authority)
        except NotFound:
            return HttpResponseRedirect(
                payment_result_url(status="failed", order_number="unknown")
            )
        return HttpResponseRedirect(
            payment_result_url(
                status="paid" if payment.paid else "failed",
                order_number=str(payment.order.number),
                reference_id=payment.reference_id,
            )
        )
