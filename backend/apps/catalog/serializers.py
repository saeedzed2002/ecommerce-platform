from rest_framework import serializers

from .models import (
    Category,
    LaptopSpecification,
    MobileSpecification,
    Product,
    ProductImage,
)


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
            "id",
            "name",
            "slug",
            "product_type",
            "brand",
            "short_description",
            "price",
            "compare_at_price",
            "discount_percent",
            "in_stock",
            "category",
            "primary_image",
            "created_at",
        )

    def get_primary_image(self, product: Product) -> str | None:
        image = next(iter(product.images.all()), None)
        if not image:
            return None
        return image.image.url if image.image else image.image_url or None


class ProductDetailSerializer(ProductListSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    specifications = serializers.SerializerMethodField()

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + (
            "description",
            "sku",
            "specifications",
            "images",
        )

    def get_specifications(self, product: Product) -> dict | None:
        if product.product_type == Product.Type.LAPTOP:
            specification = getattr(product, "laptop_specification", None)
            if specification is None:
                return None
            return LaptopSpecificationSerializer(specification).data
        specification = getattr(product, "mobile_specification", None)
        if specification is None:
            return None
        return MobileSpecificationSerializer(specification).data


class LaptopSpecificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = LaptopSpecification
        fields = (
            "processor",
            "ram_gb",
            "storage_gb",
            "display_size_inches",
            "graphics",
        )


class MobileSpecificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = MobileSpecification
        fields = (
            "ram_gb",
            "storage_gb",
            "camera_megapixels",
            "network",
            "battery_mah",
        )
