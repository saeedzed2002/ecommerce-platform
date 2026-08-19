import secrets
import uuid

from django.conf import settings
from django.db import models

from apps.catalog.models import Product, TimeStampedModel

ORDER_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def generate_order_code() -> str:
    return "".join(secrets.choice(ORDER_CODE_ALPHABET) for _ in range(7))


class Address(TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="addresses"
    )
    full_name = models.CharField(max_length=180)
    phone = models.CharField(max_length=15)
    province = models.CharField(max_length=80)
    city = models.CharField(max_length=80)
    address_line = models.TextField()
    postal_code = models.CharField(max_length=20)
    is_default = models.BooleanField(default=False)

    class Meta:
        ordering = ("-is_default", "-updated_at")

    def __str__(self) -> str:
        return f"{self.full_name} — {self.city}"


class Order(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending payment"
        PAID = "paid", "Paid"
        PROCESSING = "processing", "Processing"
        SHIPPED = "shipped", "Shipped"
        EXPIRED = "expired", "Expired"
        CANCELLED = "cancelled", "Cancelled"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="orders"
    )
    number = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    order_code = models.CharField(
        max_length=7, unique=True, editable=False, default=generate_order_code
    )
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.PENDING
    )
    expires_at = models.DateTimeField(null=True, blank=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=0)
    shipping_full_name = models.CharField(max_length=180)
    shipping_phone = models.CharField(max_length=15)
    shipping_province = models.CharField(max_length=80)
    shipping_city = models.CharField(max_length=80)
    shipping_address_line = models.TextField()
    shipping_postal_code = models.CharField(max_length=20)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"Order {self.order_code}"


class PaymentAttempt(TimeStampedModel):
    class Provider(models.TextChoices):
        ZARINPAL = "zarinpal", "Zarinpal"

    class Status(models.TextChoices):
        CREATED = "created", "Created"
        REQUESTED = "requested", "Requested"
        VERIFIED = "verified", "Verified"
        FAILED = "failed", "Failed"
        EXPIRED = "expired", "Expired"

    order = models.ForeignKey(
        Order, on_delete=models.PROTECT, related_name="payment_attempts"
    )
    provider = models.CharField(max_length=24, choices=Provider.choices)
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.CREATED
    )
    amount = models.PositiveBigIntegerField()
    authority = models.CharField(max_length=128, unique=True, null=True, blank=True)
    reference_id = models.CharField(max_length=64, blank=True)
    failure_reason = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"{self.provider} payment for {self.order.number}"


class OrderStatusEvent(models.Model):
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="status_events"
    )
    from_status = models.CharField(max_length=16, blank=True)
    to_status = models.CharField(max_length=16, choices=Order.Status.choices)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("created_at", "id")


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_items",
    )
    product_name = models.CharField(max_length=180)
    product_sku = models.CharField(max_length=64)
    unit_price = models.DecimalField(max_digits=12, decimal_places=0)
    quantity = models.PositiveIntegerField()

    @property
    def line_total(self):
        return self.unit_price * self.quantity
