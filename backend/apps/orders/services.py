from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.cart.models import CartItem
from apps.catalog.models import Product

from .models import Address, Order, OrderItem


@transaction.atomic
def create_order_from_cart(*, user, address_id: int) -> Order:
    get_user_model().objects.select_for_update().get(pk=user.pk)
    address = Address.objects.filter(pk=address_id, user=user).first()
    if address is None:
        raise ValidationError({"address_id": "Address not found."})
    cart_items = list(
        CartItem.objects.select_for_update()
        .filter(cart__user=user)
        .order_by("product_id")
    )
    if not cart_items:
        raise ValidationError({"detail": "Your cart is empty."})
    products = {
        product.pk: product
        for product in Product.objects.select_for_update()
        .filter(pk__in=[item.product_id for item in cart_items])
        .order_by("pk")
    }
    subtotal = Decimal()
    order_items = []
    for cart_item in cart_items:
        product = products.get(cart_item.product_id)
        if (
            product is None
            or product.status != Product.Status.PUBLISHED
            or not product.category.is_active
        ):
            raise ValidationError({"detail": "A cart product is no longer available."})
        if product.stock_quantity < cart_item.quantity:
            raise ValidationError({"detail": f"Insufficient stock for {product.name}."})
        subtotal += product.price * cart_item.quantity
        order_items.append((product, cart_item.quantity))
    order = Order.objects.create(
        user=user,
        subtotal=subtotal,
        shipping_full_name=address.full_name,
        shipping_phone=address.phone,
        shipping_province=address.province,
        shipping_city=address.city,
        shipping_address_line=address.address_line,
        shipping_postal_code=address.postal_code,
    )
    OrderItem.objects.bulk_create(
        [
            OrderItem(
                order=order,
                product=product,
                product_name=product.name,
                product_sku=product.sku,
                unit_price=product.price,
                quantity=quantity,
            )
            for product, quantity in order_items
        ]
    )
    for product, quantity in order_items:
        product.stock_quantity -= quantity
        product.save(update_fields=["stock_quantity", "updated_at"])
    CartItem.objects.filter(pk__in=[item.pk for item in cart_items]).delete()
    return order
