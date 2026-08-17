from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.accounts.phone import normalize_iranian_mobile

from .models import Address, Order, OrderItem


class AddressSerializer(serializers.ModelSerializer):
    def validate_phone(self, value: str) -> str:
        try:
            return normalize_iranian_mobile(value)
        except DjangoValidationError as error:
            raise serializers.ValidationError(
                "Enter a valid Iranian mobile number."
            ) from error

    class Meta:
        model = Address
        fields = (
            "id",
            "full_name",
            "phone",
            "province",
            "city",
            "address_line",
            "postal_code",
            "is_default",
        )


class OrderItemSerializer(serializers.ModelSerializer):
    line_total = serializers.DecimalField(
        max_digits=12, decimal_places=0, read_only=True
    )

    class Meta:
        model = OrderItem
        fields = (
            "id",
            "product_name",
            "product_sku",
            "unit_price",
            "quantity",
            "line_total",
        )


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "number",
            "status",
            "subtotal",
            "expires_at",
            "items",
            "created_at",
        )


class CheckoutSerializer(serializers.Serializer):
    address_id = serializers.IntegerField(min_value=1)
