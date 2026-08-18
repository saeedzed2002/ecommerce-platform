from django.db.models import Avg, Count
from rest_framework import serializers

from .models import (
    Category,
    LaptopSpecification,
    MobileSpecification,
    Product,
    ProductImage,
    ProductReview,
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
    rating_summary = serializers.SerializerMethodField()

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + (
            "description",
            "sku",
            "specifications",
            "rating_summary",
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

    def get_rating_summary(self, product: Product) -> dict[str, float | int]:
        summary = product.reviews.filter(parent__isnull=True).aggregate(
            average=Avg("rating"), count=Count("id")
        )
        return {
            "average": round(float(summary["average"] or 0), 1),
            "count": summary["count"],
        }


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


class ProductReviewReplySerializer(serializers.ModelSerializer):
    author_label = serializers.SerializerMethodField()

    class Meta:
        model = ProductReview
        fields = ("id", "body", "author_label", "created_at")

    def get_author_label(self, review: ProductReview) -> str:
        if review.user.is_admin:
            return "پشتیبانی فروشگاه"
        return f"کاربر {review.user.phone[-4:]}"


class ProductReviewSerializer(serializers.ModelSerializer):
    author_label = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()

    class Meta:
        model = ProductReview
        fields = ("id", "body", "rating", "author_label", "created_at", "replies")

    def get_author_label(self, review: ProductReview) -> str:
        if review.user.is_admin:
            return "پشتیبانی فروشگاه"
        return f"کاربر {review.user.phone[-4:]}"

    def get_replies(self, review: ProductReview) -> list[dict]:
        return ProductReviewReplySerializer(review.replies.all(), many=True).data


class ProductReviewCreateSerializer(serializers.ModelSerializer):
    parent = serializers.PrimaryKeyRelatedField(
        queryset=ProductReview.objects.select_related("product"),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = ProductReview
        fields = ("body", "rating", "parent")

    def validate_body(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Comment text cannot be empty.")
        return value

    def validate_rating(self, value: int | None) -> int | None:
        if value is not None and not 1 <= value <= 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def validate(self, attrs: dict) -> dict:
        product: Product = self.context["product"]
        request = self.context["request"]
        parent = attrs.get("parent")
        rating = attrs.get("rating")

        if parent is not None:
            if parent.product_id != product.id:
                raise serializers.ValidationError(
                    {"parent": "Reply must belong to the current product."}
                )
            if parent.parent_id:
                raise serializers.ValidationError(
                    {"parent": "Replies can only target a root review."}
                )
            if rating is not None:
                raise serializers.ValidationError(
                    {"rating": "Replies cannot have a rating."}
                )
        else:
            if rating is None:
                raise serializers.ValidationError(
                    {"rating": "A rating between 1 and 5 is required."}
                )
            if ProductReview.objects.filter(
                product=product, user=request.user, parent__isnull=True
            ).exists():
                raise serializers.ValidationError(
                    {"detail": "You have already reviewed this product."}
                )
        return attrs

    def create(self, validated_data: dict) -> ProductReview:
        return ProductReview.objects.create(
            product=self.context["product"],
            user=self.context["request"].user,
            **validated_data,
        )
