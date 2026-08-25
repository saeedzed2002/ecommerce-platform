from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.cart.models import CartItem
from apps.catalog.models import Product

from .models import Address, Coupon, Order, OrderItem, OrderStatusEvent, PaymentAttempt


def _calculate_shipping(subtotal: Decimal) -> Decimal:
    threshold = Decimal(settings.SHIPPING_FREE_THRESHOLD)
    if threshold and subtotal >= threshold:
        return Decimal()
    return Decimal(settings.SHIPPING_FLAT_RATE)


def _redeem_coupon(code: str, subtotal: Decimal) -> tuple[Coupon, Decimal]:
    coupon = (
        Coupon.objects.select_for_update().filter(code__iexact=code.strip()).first()
    )
    now = timezone.now()
    if (
        coupon is None
        or not coupon.is_active
        or (coupon.starts_at and coupon.starts_at > now)
        or (coupon.expires_at and coupon.expires_at <= now)
        or (
            coupon.max_redemptions is not None
            and coupon.redemption_count >= coupon.max_redemptions
        )
    ):
        raise ValidationError({"coupon_code": "Coupon is invalid or unavailable."})
    if subtotal < coupon.minimum_subtotal:
        raise ValidationError({"coupon_code": "Coupon minimum subtotal is not met."})
    if coupon.discount_type == Coupon.DiscountType.PERCENT:
        discount = (subtotal * coupon.amount / Decimal(100)).quantize(Decimal(1))
    else:
        discount = coupon.amount
    return coupon, min(discount, subtotal)


@transaction.atomic
def create_order_from_cart(*, user, address_id: int, coupon_code: str = "") -> Order:
    get_user_model().objects.select_for_update().get(pk=user.pk)
    pending_order = (
        Order.objects.select_for_update()
        .filter(
            user=user,
            status=Order.Status.PENDING,
            expires_at__gt=timezone.now(),
        )
        .order_by("-created_at")
        .first()
    )
    if pending_order is not None:
        return pending_order
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
    coupon = None
    discount_amount = Decimal()
    if coupon_code:
        coupon, discount_amount = _redeem_coupon(coupon_code, subtotal)
    discounted_subtotal = subtotal - discount_amount
    shipping_cost = _calculate_shipping(discounted_subtotal)
    tax_amount = (
        discounted_subtotal * Decimal(settings.TAX_RATE_PERCENT) / Decimal(100)
    ).quantize(Decimal(1))
    total = discounted_subtotal + shipping_cost + tax_amount
    order = Order.objects.create(
        user=user,
        subtotal=subtotal,
        discount_amount=discount_amount,
        shipping_cost=shipping_cost,
        tax_amount=tax_amount,
        total=total,
        coupon_code=coupon.code if coupon else "",
        expires_at=timezone.now()
        + timedelta(minutes=settings.ORDER_PAYMENT_RESERVATION_MINUTES),
        shipping_full_name=address.full_name,
        shipping_phone=address.phone,
        shipping_province=address.province,
        shipping_city=address.city,
        shipping_address_line=address.address_line,
        shipping_postal_code=address.postal_code,
    )
    if coupon:
        coupon.redemption_count += 1
        coupon.save(update_fields=["redemption_count", "updated_at"])
    OrderStatusEvent.objects.create(order=order, to_status=Order.Status.PENDING)
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
    return order


@transaction.atomic
def transition_order_status(*, order_number, target_status: str, changed_by) -> Order:
    order = (
        Order.objects.select_for_update()
        .select_related("user")
        .prefetch_related("items")
        .filter(number=order_number)
        .first()
    )
    if order is None:
        raise ValidationError({"detail": "Order not found."})

    allowed_transitions = {
        Order.Status.PENDING: {
            Order.Status.CANCELLED,
        },
        Order.Status.PAID: {
            Order.Status.PROCESSING,
            Order.Status.SHIPPED,
        },
        Order.Status.PROCESSING: {
            Order.Status.SHIPPED,
        },
    }
    if target_status not in allowed_transitions.get(order.status, set()):
        raise ValidationError(
            {"status": f"Cannot change {order.status} to {target_status}."}
        )

    previous_status = order.status
    if order.status == Order.Status.PENDING:
        _restore_order_stock(order)
        PaymentAttempt.objects.filter(
            order=order,
            status__in=(
                PaymentAttempt.Status.CREATED,
                PaymentAttempt.Status.REQUESTED,
            ),
        ).update(
            status=PaymentAttempt.Status.FAILED,
            failure_reason="Cancelled by administrator.",
        )
    if target_status == Order.Status.SHIPPED:
        if not order.carrier or not order.tracking_number:
            raise ValidationError(
                {
                    "tracking_number": "Carrier and tracking number are required before shipping."
                }
            )
        order.shipped_at = timezone.now()
    order.status = target_status
    order.save(update_fields=["status", "shipped_at", "updated_at"])
    OrderStatusEvent.objects.create(
        order=order,
        from_status=previous_status,
        to_status=target_status,
        changed_by=changed_by,
    )
    return order


def _restore_order_stock(order: Order) -> None:
    items = list(order.items.select_for_update().order_by("product_id"))
    products = {
        product.pk: product
        for product in Product.objects.select_for_update()
        .filter(pk__in=[item.product_id for item in items if item.product_id])
        .order_by("pk")
    }
    for item in items:
        product = products.get(item.product_id)
        if product is None:
            continue
        product.stock_quantity += item.quantity
        product.save(update_fields=["stock_quantity", "updated_at"])
