from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.catalog.models import (
    Category,
    LaptopSpecification,
    MobileSpecification,
    Product,
    ProductImage,
)


def create_product(
    category: Category,
    *,
    slug: str,
    status: str = Product.Status.PUBLISHED,
    featured: bool = False,
    price: Decimal = Decimal(1000000),
) -> Product:
    return Product.objects.create(
        category=category,
        name=slug.replace("-", " ").title(),
        slug=slug,
        sku=f"SKU-{slug}",
        price=price,
        status=status,
        is_featured=featured,
    )


@pytest.mark.django_db
def test_category_list_exposes_only_active_categories() -> None:
    Category.objects.create(name="Active", slug="active", is_active=True)
    Category.objects.create(name="Hidden", slug="hidden", is_active=False)

    response = APIClient().get("/api/v1/catalog/categories/")

    assert response.status_code == 200
    assert [category["slug"] for category in response.json()] == ["active"]


@pytest.mark.django_db
def test_product_list_and_detail_expose_only_published_products_in_active_categories() -> (
    None
):
    active_category = Category.objects.create(name="Active", slug="active")
    inactive_category = Category.objects.create(
        name="Inactive", slug="inactive", is_active=False
    )
    published = create_product(active_category, slug="published")
    create_product(active_category, slug="draft", status=Product.Status.DRAFT)
    create_product(active_category, slug="archived", status=Product.Status.ARCHIVED)
    create_product(inactive_category, slug="inactive-category")

    list_response = APIClient().get("/api/v1/catalog/products/")
    detail_response = APIClient().get(f"/api/v1/catalog/products/{published.slug}/")
    draft_response = APIClient().get("/api/v1/catalog/products/draft/")

    assert list_response.status_code == 200
    assert [product["slug"] for product in list_response.json()["results"]] == [
        "published"
    ]
    assert detail_response.status_code == 200
    assert detail_response.json()["slug"] == "published"
    assert draft_response.status_code == 404


@pytest.mark.django_db
def test_product_api_uses_minio_url_for_uploaded_images() -> None:
    category = Category.objects.create(name="Active", slug="active")
    product = create_product(category, slug="with-image")
    image = ProductImage.objects.create(product=product, alt_text="Product image")
    image.image.name = "products/2026/08/product.jpg"
    image.save(update_fields=["image"])

    response = APIClient().get("/api/v1/catalog/products/with-image/")

    assert response.status_code == 200
    assert (
        response.json()["primary_image"]
        == "https://minio.test/ecommerce-media/products/2026/08/product.jpg"
    )
    assert response.json()["images"] == [
        {
            "id": image.id,
            "image_url": "https://minio.test/ecommerce-media/products/2026/08/product.jpg",
            "alt_text": "Product image",
            "display_order": 0,
        },
    ]


@pytest.mark.django_db
def test_product_api_filters_laptops_with_common_and_laptop_specific_filters() -> None:
    category = Category.objects.create(name="Laptops", slug="laptops")
    laptop = create_product(category, slug="laptop", price=Decimal(30000000))
    laptop.product_type = Product.Type.LAPTOP
    laptop.brand = "Nexora"
    laptop.stock_quantity = 2
    laptop.save(update_fields=["product_type", "brand", "stock_quantity"])
    LaptopSpecification.objects.create(
        product=laptop,
        processor="Core Ultra 7",
        ram_gb=16,
        storage_gb=1024,
        display_size_inches=Decimal("14.0"),
    )
    lower_spec = create_product(category, slug="lower-spec", price=Decimal(20000000))
    LaptopSpecification.objects.create(
        product=lower_spec,
        processor="Core i5",
        ram_gb=8,
        storage_gb=512,
        display_size_inches=Decimal("15.6"),
    )

    response = APIClient().get(
        "/api/v1/catalog/products/?type=laptop&brand=nexora&min_price=25000000"
        "&ram_min=16&storage_min=1024&processor=ultra&in_stock=true"
    )

    assert response.status_code == 200
    assert [item["slug"] for item in response.data["results"]] == ["laptop"]


@pytest.mark.django_db
def test_product_detail_and_mobile_filters_expose_mobile_specifications() -> None:
    category = Category.objects.create(name="Mobiles", slug="mobiles")
    mobile = create_product(category, slug="mobile", price=Decimal(18000000))
    mobile.product_type = Product.Type.MOBILE
    mobile.brand = "Nexora Mobile"
    mobile.save(update_fields=["product_type", "brand"])
    MobileSpecification.objects.create(
        product=mobile,
        ram_gb=12,
        storage_gb=256,
        camera_megapixels=50,
        network=MobileSpecification.Network.FIVE_G,
        battery_mah=5000,
    )

    list_response = APIClient().get(
        "/api/v1/catalog/products/?type=mobile&ram_min=8&storage_min=128&network=5g"
    )
    detail_response = APIClient().get("/api/v1/catalog/products/mobile/")

    assert list_response.status_code == 200
    assert [item["slug"] for item in list_response.data["results"]] == ["mobile"]
    assert detail_response.status_code == 200
    assert detail_response.data["specifications"] == {
        "ram_gb": 12,
        "storage_gb": 256,
        "camera_megapixels": 50,
        "network": "5g",
        "battery_mah": 5000,
    }


@pytest.mark.django_db
def test_product_api_rejects_invalid_filter_values() -> None:
    response = APIClient().get("/api/v1/catalog/products/?type=mobile&network=6g")

    assert response.status_code == 400
    assert "network" in response.data
