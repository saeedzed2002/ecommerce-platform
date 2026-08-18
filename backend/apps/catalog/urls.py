from django.urls import path

from .views import (
    AdminProductCreateAPIView,
    AdminProductReviewListAPIView,
    AdminProductReviewModerationAPIView,
    CategoryListAPIView,
    ProductDetailAPIView,
    ProductListAPIView,
    ProductRatingAPIView,
    ProductReviewListCreateAPIView,
)

app_name = "catalog"

urlpatterns = [
    path(
        "admin/products/",
        AdminProductCreateAPIView.as_view(),
        name="admin-product-create",
    ),
    path(
        "admin/reviews/",
        AdminProductReviewListAPIView.as_view(),
        name="admin-review-list",
    ),
    path(
        "admin/reviews/<int:review_id>/",
        AdminProductReviewModerationAPIView.as_view(),
        name="admin-review-moderate",
    ),
    path("categories/", CategoryListAPIView.as_view(), name="category-list"),
    path("products/", ProductListAPIView.as_view(), name="product-list"),
    path(
        "products/<slug:slug>/reviews/",
        ProductReviewListCreateAPIView.as_view(),
        name="product-review-list-create",
    ),
    path(
        "products/<slug:slug>/rating/",
        ProductRatingAPIView.as_view(),
        name="product-rating",
    ),
    path(
        "products/<slug:slug>/", ProductDetailAPIView.as_view(), name="product-detail"
    ),
]
