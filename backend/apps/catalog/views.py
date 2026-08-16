from rest_framework.generics import ListAPIView, RetrieveAPIView

from .models import Category, Product
from .serializers import CategorySerializer, ProductDetailSerializer, ProductListSerializer


class CategoryListAPIView(ListAPIView):
    serializer_class = CategorySerializer
    queryset = Category.objects.filter(is_active=True)
    pagination_class = None


class ProductListAPIView(ListAPIView):
    serializer_class = ProductListSerializer

    def get_queryset(self):
        queryset = Product.objects.filter(
            status=Product.Status.PUBLISHED,
            category__is_active=True,
        ).select_related("category").prefetch_related("images")
        if category := self.request.query_params.get("category"):
            queryset = queryset.filter(category__slug=category)
        if self.request.query_params.get("featured") == "true":
            queryset = queryset.filter(is_featured=True)
        ordering = self.request.query_params.get("ordering")
        return queryset.order_by({"price": "price", "-price": "-price", "newest": "-created_at"}.get(ordering, "-created_at"))


class ProductDetailAPIView(RetrieveAPIView):
    serializer_class = ProductDetailSerializer
    lookup_field = "slug"
    queryset = Product.objects.filter(
        status=Product.Status.PUBLISHED,
        category__is_active=True,
    ).select_related("category").prefetch_related("images")
