from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.generics import DestroyAPIView, RetrieveAPIView, UpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Cart, CartItem
from .serializers import (
    AddCartItemSerializer,
    CartSerializer,
    UpdateCartItemSerializer,
)
from .services import add_item, get_cart_for_user, remove_item, update_item


def cart_queryset():
    return Cart.objects.prefetch_related(
        Prefetch("items", queryset=CartItem.objects.select_related("product__category"))
    )


def serialize_cart_for_user(user):
    cart = cart_queryset().get(user=user)
    return CartSerializer(cart).data


class CartAPIView(RetrieveAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = CartSerializer

    def get_object(self):
        get_cart_for_user(user=self.request.user)
        return cart_queryset().get(user=self.request.user)


class CartItemAPIView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        serializer = AddCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        add_item(user=request.user, **serializer.validated_data)
        return Response(
            serialize_cart_for_user(request.user), status=status.HTTP_201_CREATED
        )


class CartItemDetailAPIView(UpdateAPIView, DestroyAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = UpdateCartItemSerializer
    queryset = CartItem.objects.all()

    def get_object(self):
        return get_object_or_404(
            self.queryset.select_related("product", "cart"),
            pk=self.kwargs["pk"],
            cart__user=self.request.user,
        )

    def patch(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        update_item(
            user=request.user,
            item_id=self.kwargs["pk"],
            **serializer.validated_data,
        )
        return Response(serialize_cart_for_user(request.user))

    def delete(self, request, *args, **kwargs):
        remove_item(user=request.user, item_id=self.kwargs["pk"])
        return Response(serialize_cart_for_user(request.user))
