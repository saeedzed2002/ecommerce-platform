from django.urls import path

from .views import (
    AddressListCreateAPIView,
    CheckoutAPIView,
    OrderListAPIView,
    StartPaymentAPIView,
    ZarinpalCallbackAPIView,
)

app_name = "orders"

urlpatterns = [
    path("addresses/", AddressListCreateAPIView.as_view(), name="address-list"),
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
