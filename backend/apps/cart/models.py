from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from apps.catalog.models import Product, TimeStampedModel


class Cart(TimeStampedModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cart",
    )

    def __str__(self) -> str:
        return f"Cart for {self.user}"


class CartItem(TimeStampedModel):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="cart_items"
    )
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("cart", "product"), name="cart_one_item_per_product"
            ),
        ]

    def clean(self) -> None:
        super().clean()
        if self.quantity > self.product.stock_quantity:
            raise ValidationError(
                {"quantity": "Quantity cannot exceed available stock."}
            )

    def __str__(self) -> str:
        return f"{self.quantity} × {self.product}"
