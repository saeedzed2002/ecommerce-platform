from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.db.models import Count, Prefetch, Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import (
    CreateAPIView,
    ListAPIView,
    ListCreateAPIView,
    RetrieveAPIView,
    RetrieveUpdateDestroyAPIView,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, MobileSpecification, Product, ProductReview
from .permissions import IsPlatformAdmin
from .serializers import (
    AdminCategorySerializer,
    AdminProductListSerializer,
    AdminProductReviewSerializer,
    AdminProductSerializer,
    CategorySerializer,
    ProductDetailSerializer,
    ProductListSerializer,
    ProductRatingSerializer,
    ProductReviewCreateSerializer,
    ProductReviewModerationSerializer,
    ProductReviewSerializer,
    product_rating_summary,
)


class CategoryListAPIView(ListAPIView):
    serializer_class = CategorySerializer
    queryset = Category.objects.filter(is_active=True)
    pagination_class = None


class AdminCategoryCreateAPIView(ListCreateAPIView):
    permission_classes = (IsPlatformAdmin,)
    serializer_class = AdminCategorySerializer

    def get_queryset(self):
        return Category.objects.all()


class ProductListAPIView(ListAPIView):
    serializer_class = ProductListSerializer

    def _positive_decimal(self, name: str) -> Decimal | None:
        raw_value = self.request.query_params.get(name)
        if raw_value in (None, ""):
            return None
        try:
            value = Decimal(raw_value)
        except InvalidOperation as error:
            raise ValidationError({name: "Enter a valid number."}) from error
        if value < 0:
            raise ValidationError({name: "Enter a non-negative number."})
        return value

    def _positive_integer(self, name: str) -> int | None:
        raw_value = self.request.query_params.get(name)
        if raw_value in (None, ""):
            return None
        try:
            value = int(raw_value)
        except ValueError as error:
            raise ValidationError({name: "Enter a valid whole number."}) from error
        if value < 0:
            raise ValidationError({name: "Enter a non-negative whole number."})
        return value

    def get_queryset(self):
        queryset = (
            Product.objects.filter(
                status=Product.Status.PUBLISHED,
                category__is_active=True,
            )
            .select_related("category")
            .select_related("laptop_specification", "mobile_specification")
            .prefetch_related("images")
        )
        if category := self.request.query_params.get("category"):
            queryset = queryset.filter(category__slug=category)
        if query := self.request.query_params.get("q", "").strip():
            queryset = queryset.filter(
                Q(name__icontains=query)
                | Q(sku__icontains=query)
                | Q(brand__icontains=query)
                | Q(short_description__icontains=query)
                | Q(description__icontains=query)
            )
        if self.request.query_params.get("featured") == "true":
            queryset = queryset.filter(is_featured=True)
        product_type = self.request.query_params.get("type", "").strip()
        if product_type:
            valid_types = {value for value, _ in Product.Type.choices}
            if product_type not in valid_types:
                raise ValidationError({"type": "Unsupported product type."})
            queryset = queryset.filter(product_type=product_type)
        if brand := self.request.query_params.get("brand", "").strip():
            queryset = queryset.filter(brand__iexact=brand)
        min_price = self._positive_decimal("min_price")
        max_price = self._positive_decimal("max_price")
        if min_price is not None and max_price is not None and min_price > max_price:
            raise ValidationError({"max_price": "Must be greater than min_price."})
        if min_price is not None:
            queryset = queryset.filter(price__gte=min_price)
        if max_price is not None:
            queryset = queryset.filter(price__lte=max_price)
        if self.request.query_params.get("in_stock") == "true":
            queryset = queryset.filter(stock_quantity__gt=0)

        ram_min = self._positive_integer("ram_min")
        storage_min = self._positive_integer("storage_min")
        if product_type == Product.Type.LAPTOP:
            if ram_min is not None:
                queryset = queryset.filter(laptop_specification__ram_gb__gte=ram_min)
            if storage_min is not None:
                queryset = queryset.filter(
                    laptop_specification__storage_gb__gte=storage_min
                )
            if processor := self.request.query_params.get("processor", "").strip():
                queryset = queryset.filter(
                    laptop_specification__processor__icontains=processor
                )
            display_size_min = self._positive_decimal("display_size_min")
            if display_size_min is not None:
                queryset = queryset.filter(
                    laptop_specification__display_size_inches__gte=display_size_min
                )
            if graphics := self.request.query_params.get("graphics", "").strip():
                queryset = queryset.filter(
                    laptop_specification__graphics__icontains=graphics
                )
        if product_type == Product.Type.MOBILE:
            if ram_min is not None:
                queryset = queryset.filter(mobile_specification__ram_gb__gte=ram_min)
            if storage_min is not None:
                queryset = queryset.filter(
                    mobile_specification__storage_gb__gte=storage_min
                )
            if network := self.request.query_params.get("network", "").strip():
                valid_networks = {
                    value for value, _ in MobileSpecification.Network.choices
                }
                if network not in valid_networks:
                    raise ValidationError({"network": "Unsupported mobile network."})
                queryset = queryset.filter(mobile_specification__network=network)
            camera_min = self._positive_integer("camera_min")
            if camera_min is not None:
                queryset = queryset.filter(
                    mobile_specification__camera_megapixels__gte=camera_min
                )
            battery_min = self._positive_integer("battery_min")
            if battery_min is not None:
                queryset = queryset.filter(
                    mobile_specification__battery_mah__gte=battery_min
                )
        ordering = self.request.query_params.get("ordering")
        return queryset.order_by(
            {"price": "price", "-price": "-price", "newest": "-created_at"}.get(
                ordering, "-created_at"
            )
        )


class ProductDetailAPIView(RetrieveAPIView):
    serializer_class = ProductDetailSerializer
    lookup_field = "slug"
    queryset = (
        Product.objects.filter(
            status=Product.Status.PUBLISHED,
            category__is_active=True,
        )
        .select_related("category")
        .select_related("laptop_specification", "mobile_specification")
        .prefetch_related("images")
    )


class ProductReviewListCreateAPIView(ListCreateAPIView):
    permission_classes = (AllowAny,)

    def get_permissions(self):
        if self.request.method == "POST":
            return (IsAuthenticated(),)
        return super().get_permissions()

    def get_product(self) -> Product:
        if not hasattr(self, "_product"):
            self._product = get_object_or_404(
                Product.objects.filter(
                    status=Product.Status.PUBLISHED,
                    category__is_active=True,
                ),
                slug=self.kwargs["slug"],
            )
        return self._product

    def get_queryset(self):
        return (
            ProductReview.objects.filter(
                product=self.get_product(),
                parent__isnull=True,
                moderation_status=ProductReview.ModerationStatus.APPROVED,
            )
            .select_related("user")
            .prefetch_related(
                Prefetch(
                    "replies",
                    queryset=ProductReview.objects.select_related("user").order_by(
                        "created_at", "id"
                    ),
                )
            )
        )

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ProductReviewCreateSerializer
        return ProductReviewSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["product"] = self.get_product()
        return context

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = serializer.save()
        response_serializer = ProductReviewSerializer(
            review, context=self.get_serializer_context()
        )
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class ProductRatingAPIView(APIView):
    permission_classes = (AllowAny,)

    def get_permissions(self):
        if self.request.method in {"PUT", "PATCH"}:
            return (IsAuthenticated(),)
        return super().get_permissions()

    def get_product(self) -> Product:
        if not hasattr(self, "_product"):
            self._product = get_object_or_404(
                Product.objects.filter(
                    status=Product.Status.PUBLISHED,
                    category__is_active=True,
                ),
                slug=self.kwargs["slug"],
            )
        return self._product

    def get(self, request, *args, **kwargs):
        product = self.get_product()
        response_data = product_rating_summary(product)
        response_data["my_score"] = None
        if request.user.is_authenticated:
            response_data["my_score"] = (
                product.ratings.filter(user=request.user)
                .values_list("score", flat=True)
                .first()
            )
        return Response(response_data)

    def put(self, request, *args, **kwargs):
        serializer = ProductRatingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = self.get_product()
        rating, _ = product.ratings.update_or_create(
            user=request.user,
            defaults={"score": serializer.validated_data["score"]},
        )
        response_data = product_rating_summary(product)
        response_data["my_score"] = rating.score
        return Response(response_data)

    patch = put


class AdminProductListCreateAPIView(CreateAPIView):
    permission_classes = (IsPlatformAdmin,)
    serializer_class = AdminProductSerializer

    def perform_create(self, serializer):
        with transaction.atomic():
            product = serializer.save()
            for index, image in enumerate(self.request.FILES.getlist("images")):
                product.images.create(
                    image=image,
                    alt_text=self.request.data.get("image_alt_text", ""),
                    display_order=index,
                )


class AdminProductListAPIView(ListAPIView):
    permission_classes = (IsPlatformAdmin,)
    serializer_class = AdminProductListSerializer
    pagination_class = None

    def get_queryset(self):
        queryset = (
            Product.objects.select_related("category")
            .prefetch_related("images")
            .annotate(review_count=Count("reviews"))
            .order_by("name")
        )
        if query := self.request.query_params.get("q", "").strip():
            queryset = queryset.filter(
                Q(name__icontains=query)
                | Q(sku__icontains=query)
                | Q(brand__icontains=query)
                | Q(short_description__icontains=query)
            )
        return queryset


class AdminProductDetailAPIView(RetrieveUpdateDestroyAPIView):
    permission_classes = (IsPlatformAdmin,)
    serializer_class = AdminProductSerializer
    lookup_field = "slug"
    queryset = Product.objects.select_related("category").prefetch_related("images")

    def perform_destroy(self, instance):
        if instance.order_items.exists():
            raise ValidationError(
                {
                    "detail": "Products referenced by orders must be archived, not deleted."
                }
            )
        instance.delete()


class AdminProductReviewListAPIView(ListAPIView):
    permission_classes = (IsPlatformAdmin,)
    serializer_class = AdminProductReviewSerializer

    def get_queryset(self):
        queryset = ProductReview.objects.select_related("product", "user", "parent")
        product_slug = self.kwargs["slug"]
        queryset = queryset.filter(product__slug=product_slug)
        moderation_status = self.request.query_params.get("status", "").strip()
        if moderation_status:
            valid_statuses = {
                choice for choice, _ in ProductReview.ModerationStatus.choices
            }
            if moderation_status not in valid_statuses:
                raise ValidationError({"status": "Invalid review status."})
            queryset = queryset.filter(moderation_status=moderation_status)
        return queryset


class AdminProductReviewModerationAPIView(APIView):
    permission_classes = (IsPlatformAdmin,)

    def patch(self, request, review_id):
        review = get_object_or_404(ProductReview, pk=review_id)
        serializer = ProductReviewModerationSerializer(review, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(AdminProductReviewSerializer(review).data)
