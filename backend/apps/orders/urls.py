from django.urls import path

from .views import (
    AddressListCreateAPIView,
    AdminOrderListAPIView,
    AdminOrderStatusAPIView,
    AdminOrderSummaryAPIView,
    CheckoutAPIView,
    CustomerOrderSummaryAPIView,
    OrderListAPIView,
    StartPaymentAPIView,
    ZarinpalCallbackAPIView,
)

app_name = "orders"

urlpatterns = [
    path("addresses/", AddressListCreateAPIView.as_view(), name="address-list"),
    path("admin/", AdminOrderListAPIView.as_view(), name="admin-order-list"),
    path(
        "admin/summary/",
        AdminOrderSummaryAPIView.as_view(),
        name="admin-order-summary",
    ),
    path(
        "admin/<uuid:order_number>/status/",
        AdminOrderStatusAPIView.as_view(),
        name="admin-order-status",
    ),
    path("summary/", CustomerOrderSummaryAPIView.as_view(), name="order-summary"),
    path("", OrderListAPIView.as_view(), name="order-list"),
    path("checkout/", CheckoutAPIView.as_view(), name="checkout"),
    path(
        "<uuid:order_number>/payment/",
        StartPaymentAPIView.as_view(),
        name="payment-start",
    ),
    path(
        "payments/zarinpal/callback/",
        ZarinpalCallbackAPIView.as_view(),
        name="zarinpal-callback",
    ),
]
