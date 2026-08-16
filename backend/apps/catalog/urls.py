from django.urls import path

from .views import CategoryListAPIView, ProductDetailAPIView, ProductListAPIView

app_name = "catalog"

urlpatterns = [
    path("categories/", CategoryListAPIView.as_view(), name="category-list"),
    path("products/", ProductListAPIView.as_view(), name="product-list"),
    path("products/<slug:slug>/", ProductDetailAPIView.as_view(), name="product-detail"),
]
