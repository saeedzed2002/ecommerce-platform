from django.contrib import admin

from .models import (
    Category,
    LaptopSpecification,
    MobileSpecification,
    Product,
    ProductImage,
    ProductReview,
)


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0
    fields = ("image", "alt_text", "display_order")


class LaptopSpecificationInline(admin.StackedInline):
    model = LaptopSpecification
    extra = 0
    max_num = 1


class MobileSpecificationInline(admin.StackedInline):
    model = MobileSpecification
    extra = 0
    max_num = 1


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active", "display_order")
    list_editable = ("is_active", "display_order")
    list_filter = ("is_active",)
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "category",
        "product_type",
        "brand",
        "price",
        "stock_quantity",
        "status",
        "is_featured",
    )
    list_editable = ("price", "stock_quantity", "status", "is_featured")
    list_filter = ("product_type", "status", "is_featured", "category")
    search_fields = ("name", "sku", "slug")
    prepopulated_fields = {"slug": ("name",)}
    inlines = (ProductImageInline, LaptopSpecificationInline, MobileSpecificationInline)


@admin.register(ProductReview)
class ProductReviewAdmin(admin.ModelAdmin):
    list_display = ("product", "user", "parent", "rating", "created_at")
    list_filter = ("rating", "created_at")
    search_fields = ("product__name", "user__phone", "body")
    autocomplete_fields = ("product", "user", "parent")
    readonly_fields = ("created_at", "updated_at")
