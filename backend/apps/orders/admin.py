from django.contrib import admin

from .models import Coupon, Order


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = (
        "code",
        "discount_type",
        "amount",
        "is_active",
        "redemption_count",
        "max_redemptions",
        "expires_at",
    )
    list_filter = ("discount_type", "is_active")
    search_fields = ("code",)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_code",
        "status",
        "total",
        "carrier",
        "tracking_number",
        "shipped_at",
    )
    list_filter = ("status", "carrier")
    search_fields = ("order_code", "tracking_number", "shipping_phone")
