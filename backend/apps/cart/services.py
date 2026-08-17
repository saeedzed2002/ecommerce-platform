from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from apps.catalog.models import Product
from apps.orders.models import Order

from .models import Cart, CartItem


def get_cart_for_user(*, user) -> Cart:
    cart, _ = Cart.objects.get_or_create(user=user)
    return cart


def ensure_cart_is_not_reserved(*, user) -> None:
    if Order.objects.filter(
        user=user,
        status=Order.Status.PENDING,
        expires_at__gt=timezone.now(),
    ).exists():
        raise ValidationError(
            {"detail": "Complete or wait for the pending payment before editing cart."}
        )


@transaction.atomic
def add_item(*, user, product_id: int, quantity: int) -> Cart:
    get_user_model().objects.select_for_update().get(pk=user.pk)
    ensure_cart_is_not_reserved(user=user)
    product = (
        Product.objects.select_for_update()
        .select_related("category")
        .filter(
            pk=product_id,
            status=Product.Status.PUBLISHED,
            category__is_active=True,
        )
        .first()
    )
    if product is None:
        raise NotFound("Product not found.")
    if product.stock_quantity < 1:
        raise ValidationError({"product_id": "This product is out of stock."})
    cart = get_cart_for_user(user=user)
    item, created = CartItem.objects.select_for_update().get_or_create(
        cart=cart,
        product=product,
        defaults={"quantity": quantity},
    )
    if not created:
        item.quantity += quantity
    if item.quantity > product.stock_quantity:
        raise ValidationError({"quantity": "Quantity exceeds available stock."})
    item.save()
    return cart


@transaction.atomic
def update_item(*, user, item_id: int, quantity: int) -> Cart:
    get_user_model().objects.select_for_update().get(pk=user.pk)
    ensure_cart_is_not_reserved(user=user)
    item = (
        CartItem.objects.select_for_update()
        .select_related("product", "cart")
        .filter(pk=item_id, cart__user=user)
        .first()
    )
    if item is None:
        raise NotFound("Cart item not found.")
    if quantity > item.product.stock_quantity:
        raise ValidationError({"quantity": "Quantity exceeds available stock."})
    item.quantity = quantity
    item.save(update_fields=["quantity", "updated_at"])
    return item.cart


@transaction.atomic
def remove_item(*, user, item_id: int) -> Cart:
    get_user_model().objects.select_for_update().get(pk=user.pk)
    ensure_cart_is_not_reserved(user=user)
    item = (
        CartItem.objects.select_for_update()
        .select_related("cart")
        .filter(pk=item_id, cart__user=user)
        .first()
    )
    if item is None:
        raise NotFound("Cart item not found.")
    cart = item.cart
    item.delete()
    return cart
