from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.accounts.phone import normalize_iranian_mobile

from .models import Address, Coupon, Order, OrderItem, OrderStatusEvent


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
    product_primary_image = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = (
            "id",
            "product_name",
            "product_sku",
            "unit_price",
            "quantity",
            "line_total",
            "product_primary_image",
        )

    def get_product_primary_image(self, item: OrderItem) -> str | None:
        if item.product is None:
            return None
        image = next(iter(item.product.images.all()), None)
        if image is None:
            return None
        return image.image.url if image.image else image.image_url or None


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
            "discount_amount",
            "shipping_cost",
            "tax_amount",
            "total",
            "coupon_code",
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
            "carrier",
            "tracking_number",
            "shipped_at",
        )


class OrderDetailSerializer(OrderSerializer):
    payment_reference = serializers.SerializerMethodField()

    class Meta(OrderSerializer.Meta):
        fields = OrderSerializer.Meta.fields + (
            "shipping_full_name",
            "shipping_phone",
            "shipping_province",
            "shipping_city",
            "shipping_address_line",
            "shipping_postal_code",
            "carrier",
            "tracking_number",
            "shipped_at",
            "payment_reference",
        )

    def get_payment_reference(self, order: Order) -> str:
        payment = next(
            (
                item
                for item in order.payment_attempts.all()
                if item.status == "verified" and item.reference_id
            ),
            None,
        )
        return payment.reference_id if payment else ""


class OrderStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.Status.choices)
    carrier = serializers.CharField(max_length=80, required=False, allow_blank=True)
    tracking_number = serializers.CharField(
        max_length=120, required=False, allow_blank=True
    )


class CheckoutSerializer(serializers.Serializer):
    address_id = serializers.IntegerField(min_value=1)
    coupon_code = serializers.CharField(max_length=40, required=False, allow_blank=True)


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = (
            "id",
            "code",
            "discount_type",
            "amount",
            "minimum_subtotal",
            "starts_at",
            "expires_at",
            "max_redemptions",
            "redemption_count",
            "is_active",
        )
        read_only_fields = ("id", "redemption_count")

    def validate_code(self, value: str) -> str:
        return value.strip().upper()

    def validate(self, attrs):
        if (
            attrs.get("discount_type", getattr(self.instance, "discount_type", None))
            == Coupon.DiscountType.PERCENT
        ):
            amount = attrs.get("amount", getattr(self.instance, "amount", None))
            if amount is not None and not 0 < amount <= 100:
                raise serializers.ValidationError(
                    {"amount": "Percent coupons must be between 1 and 100."}
                )
        starts_at = attrs.get("starts_at", getattr(self.instance, "starts_at", None))
        expires_at = attrs.get("expires_at", getattr(self.instance, "expires_at", None))
        if starts_at and expires_at and expires_at <= starts_at:
            raise serializers.ValidationError(
                {"expires_at": "Expiry must be after the start time."}
            )
        return attrs
