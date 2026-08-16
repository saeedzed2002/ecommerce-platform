from rest_framework import serializers

from .models import Category, Product, ProductImage


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "slug", "description", "image_url")


class ProductImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ("id", "image_url", "alt_text", "display_order")

    def get_image_url(self, image: ProductImage) -> str | None:
        if image.image:
            return image.image.url
        return image.image_url or None


class ProductListSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    primary_image = serializers.SerializerMethodField()
    in_stock = serializers.BooleanField(source="is_in_stock", read_only=True)
    discount_percent = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = (
            "id", "name", "slug", "short_description", "price", "compare_at_price",
            "discount_percent", "in_stock", "category", "primary_image", "created_at",
        )

    def get_primary_image(self, product: Product) -> str | None:
        image = next(iter(product.images.all()), None)
        if not image:
            return None
        return image.image.url if image.image else image.image_url or None


class ProductDetailSerializer(ProductListSerializer):
    images = ProductImageSerializer(many=True, read_only=True)

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + ("description", "sku", "images")
