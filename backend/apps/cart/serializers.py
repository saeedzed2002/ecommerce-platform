from decimal import Decimal

from rest_framework import serializers

from apps.catalog.serializers import ProductListSerializer

from .models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ("id", "product", "quantity", "line_total")

    def get_line_total(self, item: CartItem) -> Decimal:
        return item.product.price * item.quantity


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    item_count = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ("id", "items", "item_count", "subtotal", "updated_at")

    def get_item_count(self, cart: Cart) -> int:
        return sum(item.quantity for item in cart.items.all())

    def get_subtotal(self, cart: Cart) -> Decimal:
        return sum(
            (item.product.price * item.quantity for item in cart.items.all()), Decimal()
        )


class AddCartItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, default=1)


class UpdateCartItemSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1)
