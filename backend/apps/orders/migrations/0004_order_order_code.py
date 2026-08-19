import secrets

from django.db import migrations, models

from apps.orders.models import generate_order_code

ORDER_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def generate_code() -> str:
    return "".join(secrets.choice(ORDER_CODE_ALPHABET) for _ in range(7))


def populate_order_codes(apps, schema_editor):
    Order = apps.get_model("orders", "Order")
    used_codes = set(
        Order.objects.exclude(order_code__isnull=True).values_list(
            "order_code", flat=True
        )
    )
    for order in Order.objects.filter(order_code__isnull=True).iterator():
        code = generate_code()
        while code in used_codes:
            code = generate_code()
        Order.objects.filter(pk=order.pk).update(order_code=code)
        used_codes.add(code)


class Migration(migrations.Migration):
    dependencies = [
        ("orders", "0003_orderstatusevent"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="order_code",
            field=models.CharField(blank=True, max_length=7, null=True),
        ),
        migrations.RunPython(populate_order_codes, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="order",
            name="order_code",
            field=models.CharField(
                default=generate_order_code,
                editable=False,
                max_length=7,
                unique=True,
            ),
        ),
    ]
