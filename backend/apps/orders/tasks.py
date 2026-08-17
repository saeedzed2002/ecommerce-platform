from celery import shared_task
from django.db import transaction
from django.utils import timezone

from apps.catalog.models import Product

from .models import Order, PaymentAttempt


@shared_task
def expire_pending_orders() -> int:
    expired_count = 0
    candidate_ids = Order.objects.filter(
        status=Order.Status.PENDING, expires_at__lte=timezone.now()
    ).values_list("pk", flat=True)
    for order_id in candidate_ids.iterator():
        with transaction.atomic():
            order = Order.objects.select_for_update().filter(pk=order_id).first()
            if (
                order is None
                or order.status != Order.Status.PENDING
                or order.expires_at is None
                or order.expires_at > timezone.now()
            ):
                continue
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
            order.status = Order.Status.EXPIRED
            order.save(update_fields=["status", "updated_at"])
            PaymentAttempt.objects.filter(
                order=order,
                status__in=(
                    PaymentAttempt.Status.CREATED,
                    PaymentAttempt.Status.REQUESTED,
                ),
            ).update(status=PaymentAttempt.Status.EXPIRED)
            expired_count += 1
    return expired_count
