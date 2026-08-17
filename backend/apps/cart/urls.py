from django.urls import path

from .views import CartAPIView, CartItemAPIView, CartItemDetailAPIView

app_name = "cart"

urlpatterns = [
    path("", CartAPIView.as_view(), name="cart"),
    path("items/", CartItemAPIView.as_view(), name="cart-item-list"),
    path("items/<int:pk>/", CartItemDetailAPIView.as_view(), name="cart-item-detail"),
]
