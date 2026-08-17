from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.catalog.models import Category, Product, ProductImage


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
