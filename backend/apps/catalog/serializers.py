from django.db.models import Avg, Count
from rest_framework import serializers

from .models import (
    Category,
    LaptopSpecification,
    MobileSpecification,
    Product,
    ProductImage,
    ProductRating,
    ProductReview,
)


def product_rating_summary(product: Product) -> dict[str, float | int]:
    summary = product.ratings.aggregate(average=Avg("score"), count=Count("id"))
    return {
        "average": round(float(summary["average"] or 0), 1),
        "count": summary["count"],
    }


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
        return product_rating_summary(product)


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
        return review.user.display_name or "کاربر"


class ProductReviewSerializer(serializers.ModelSerializer):
    author_label = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()

    class Meta:
        model = ProductReview
        fields = ("id", "body", "author_label", "created_at", "replies")

    def get_author_label(self, review: ProductReview) -> str:
        return review.user.display_name or "کاربر"

    def get_replies(self, review: ProductReview) -> list[dict]:
        return ProductReviewReplySerializer(
            review.replies.filter(
                moderation_status=ProductReview.ModerationStatus.APPROVED
            ),
            many=True,
        ).data


class AdminProductSerializer(serializers.ModelSerializer):
    laptop_specification = LaptopSpecificationSerializer(required=False)
    mobile_specification = MobileSpecificationSerializer(required=False)
    images = ProductImageSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = (
            "id",
            "category",
            "product_type",
            "brand",
            "name",
            "slug",
            "sku",
            "short_description",
            "description",
            "price",
            "compare_at_price",
            "stock_quantity",
            "status",
            "is_featured",
            "laptop_specification",
            "mobile_specification",
            "images",
            "created_at",
        )
        read_only_fields = ("id", "created_at")

    def validate(self, attrs: dict) -> dict:
        product_type = attrs.get("product_type", Product.Type.LAPTOP)
        laptop_specification = attrs.get("laptop_specification")
        mobile_specification = attrs.get("mobile_specification")
        if product_type == Product.Type.LAPTOP:
            if mobile_specification is not None:
                raise serializers.ValidationError(
                    {"mobile_specification": "Mobile details do not apply to laptops."}
                )
            if laptop_specification is None:
                raise serializers.ValidationError(
                    {"laptop_specification": "Laptop details are required."}
                )
        if product_type == Product.Type.MOBILE:
            if laptop_specification is not None:
                raise serializers.ValidationError(
                    {"laptop_specification": "Laptop details do not apply to mobiles."}
                )
            if mobile_specification is None:
                raise serializers.ValidationError(
                    {"mobile_specification": "Mobile details are required."}
                )
        return attrs

    def create(self, validated_data: dict) -> Product:
        laptop_specification = validated_data.pop("laptop_specification", None)
        mobile_specification = validated_data.pop("mobile_specification", None)
        product = Product.objects.create(**validated_data)
        if laptop_specification is not None:
            LaptopSpecification.objects.create(product=product, **laptop_specification)
        if mobile_specification is not None:
            MobileSpecification.objects.create(product=product, **mobile_specification)
        return product


class AdminProductListSerializer(serializers.ModelSerializer):
    review_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = ("id", "name", "slug", "status", "review_count")


class AdminProductReviewSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_slug = serializers.CharField(source="product.slug", read_only=True)
    customer_phone = serializers.CharField(source="user.phone", read_only=True)
    customer_name = serializers.SerializerMethodField()

    class Meta:
        model = ProductReview
        fields = (
            "id",
            "product_name",
            "product_slug",
            "customer_phone",
            "customer_name",
            "body",
            "parent",
            "moderation_status",
            "created_at",
        )
        read_only_fields = (
            "id",
            "product_name",
            "product_slug",
            "customer_phone",
            "customer_name",
            "body",
            "parent",
            "created_at",
        )

    def get_customer_name(self, review: ProductReview) -> str:
        return review.user.display_name or "کاربر"


class ProductReviewModerationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductReview
        fields = ("moderation_status",)


class ProductReviewCreateSerializer(serializers.ModelSerializer):
    parent = serializers.PrimaryKeyRelatedField(
        queryset=ProductReview.objects.select_related("product"),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = ProductReview
        fields = ("body", "parent")

    def validate_body(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Comment text cannot be empty.")
        return value

    def validate(self, attrs: dict) -> dict:
        product: Product = self.context["product"]
        parent = attrs.get("parent")

        if "rating" in self.initial_data:
            raise serializers.ValidationError(
                {"rating": "Submit ratings through the product rating endpoint."}
            )

        if parent is not None:
            if parent.product_id != product.id:
                raise serializers.ValidationError(
                    {"parent": "Reply must belong to the current product."}
                )
            if parent.parent_id:
                raise serializers.ValidationError(
                    {"parent": "Replies can only target a root review."}
                )
        return attrs

    def create(self, validated_data: dict) -> ProductReview:
        return ProductReview.objects.create(
            product=self.context["product"],
            user=self.context["request"].user,
            **validated_data,
        )


class ProductRatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductRating
        fields = ("score",)

    def validate_score(self, value: int) -> int:
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value
