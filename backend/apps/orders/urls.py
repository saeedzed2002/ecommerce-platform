from django.urls import path

from .views import AddressListCreateAPIView, CheckoutAPIView, OrderListAPIView

app_name = "orders"

urlpatterns = [
    path("addresses/", AddressListCreateAPIView.as_view(), name="address-list"),
    path("", OrderListAPIView.as_view(), name="order-list"),
    path("checkout/", CheckoutAPIView.as_view(), name="checkout"),
]
