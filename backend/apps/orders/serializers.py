from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.accounts.phone import normalize_iranian_mobile

from .models import Address, Order, OrderItem, OrderStatusEvent


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


class OrderStatusEventSerializer(serializers.ModelSerializer):
    changed_by_phone = serializers.CharField(
        source="changed_by.phone", read_only=True, default=None
    )

    class Meta:
        model = OrderStatusEvent
        fields = ("from_status", "to_status", "changed_by_phone", "created_at")


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_events = OrderStatusEventSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "number",
            "order_code",
            "status",
            "subtotal",
            "expires_at",
            "items",
            "status_events",
            "created_at",
        )


class AdminOrderSerializer(OrderSerializer):
    customer_phone = serializers.CharField(source="user.phone", read_only=True)

    class Meta(OrderSerializer.Meta):
        fields = OrderSerializer.Meta.fields + (
            "customer_phone",
            "shipping_full_name",
            "shipping_city",
        )


class OrderStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.Status.choices)


class CheckoutSerializer(serializers.Serializer):
    address_id = serializers.IntegerField(min_value=1)
