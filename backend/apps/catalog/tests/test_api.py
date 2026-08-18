from decimal import Decimal

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.catalog.models import (
    Category,
    LaptopSpecification,
    MobileSpecification,
    Product,
    ProductImage,
    ProductReview,
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


@pytest.mark.django_db
def test_product_reviews_allow_multiple_comments_and_ratings_are_independent() -> None:
    category = Category.objects.create(name="Laptops", slug="laptops")
    product = create_product(category, slug="reviewed-laptop")
    customer = User.objects.create_user(phone="989121234567")
    other_customer = User.objects.create_user(phone="989198765432")
    client = APIClient()

    anonymous_review = client.post(
        f"/api/v1/catalog/products/{product.slug}/reviews/",
        {"body": "A well-balanced laptop."},
    )
    anonymous_rating = client.put(
        f"/api/v1/catalog/products/{product.slug}/rating/", {"score": 5}
    )

    assert anonymous_review.status_code == 401
    assert anonymous_rating.status_code == 401

    client.force_authenticate(customer)
    first_comment = client.post(
        f"/api/v1/catalog/products/{product.slug}/reviews/",
        {"body": "A well-balanced laptop."},
    )
    second_comment = client.post(
        f"/api/v1/catalog/products/{product.slug}/reviews/",
        {"body": "The screen is bright too."},
    )
    first_rating = client.put(
        f"/api/v1/catalog/products/{product.slug}/rating/", {"score": 5}
    )
    updated_rating = client.put(
        f"/api/v1/catalog/products/{product.slug}/rating/", {"score": 3}
    )
    client.force_authenticate(other_customer)
    other_rating = client.put(
        f"/api/v1/catalog/products/{product.slug}/rating/", {"score": 4}
    )
    detail_response = APIClient().get(f"/api/v1/catalog/products/{product.slug}/")

    assert first_comment.status_code == 201
    assert second_comment.status_code == 201
    assert first_comment.data["author_label"] == "کاربر"
    assert first_rating.data == {"average": 5.0, "count": 1, "my_score": 5}
    assert updated_rating.data == {"average": 3.0, "count": 1, "my_score": 3}
    assert other_rating.data == {"average": 3.5, "count": 2, "my_score": 4}
    assert detail_response.data["rating_summary"] == {"average": 3.5, "count": 2}

    customer.display_name = "سعید"
    customer.save(update_fields=("display_name",))
    comments_response = APIClient().get(
        f"/api/v1/catalog/products/{product.slug}/reviews/"
    )

    assert comments_response.data["results"][0]["author_label"] == "سعید"


@pytest.mark.django_db
def test_product_review_reply_is_limited_to_the_same_root_review() -> None:
    category = Category.objects.create(name="Mobiles", slug="mobiles")
    product = create_product(category, slug="reviewed-mobile")
    other_product = create_product(category, slug="other-mobile")
    author = User.objects.create_user(phone="989121234567")
    responder = User.objects.create_user(phone="989198765432")
    root_review = ProductReview.objects.create(
        product=product,
        user=author,
        body="Battery life is great.",
    )
    client = APIClient()
    client.force_authenticate(responder)

    reply_response = client.post(
        f"/api/v1/catalog/products/{product.slug}/reviews/",
        {"body": "Thanks for the useful review.", "parent": root_review.id},
    )
    invalid_rating_response = client.post(
        f"/api/v1/catalog/products/{product.slug}/reviews/",
        {"body": "This cannot be rated.", "parent": root_review.id, "rating": 5},
    )
    invalid_product_response = client.post(
        f"/api/v1/catalog/products/{other_product.slug}/reviews/",
        {"body": "This targets another product.", "parent": root_review.id},
    )
    list_response = APIClient().get(f"/api/v1/catalog/products/{product.slug}/reviews/")

    assert reply_response.status_code == 201
    assert invalid_rating_response.status_code == 400
    assert invalid_product_response.status_code == 400
    assert list_response.status_code == 200
    assert list_response.data["results"] == [
        {
            "id": root_review.id,
            "body": "Battery life is great.",
            "author_label": "کاربر",
            "created_at": list_response.data["results"][0]["created_at"],
            "replies": [
                {
                    "id": reply_response.data["id"],
                    "body": "Thanks for the useful review.",
                    "author_label": "کاربر",
                    "created_at": list_response.data["results"][0]["replies"][0][
                        "created_at"
                    ],
                }
            ],
        }
    ]


@pytest.mark.django_db
def test_admin_can_create_products_and_moderate_reviews() -> None:
    category = Category.objects.create(name="Laptops", slug="laptops")
    customer = User.objects.create_user(phone="989121234567")
    admin = User.objects.create_user(
        phone="989198765432", role=User.Role.ADMIN, is_staff=True
    )
    product = create_product(category, slug="reviewed-product")
    review = ProductReview.objects.create(
        product=product, user=customer, body="This should be moderated."
    )
    client = APIClient()

    client.force_authenticate(customer)
    assert (
        client.post(
            "/api/v1/catalog/admin/products/",
            {
                "category": category.id,
                "product_type": "laptop",
                "name": "Unauthorized product",
                "slug": "unauthorized-product",
                "sku": "UNAUTHORIZED",
                "price": "1000000",
                "laptop_specification": {
                    "processor": "Core Ultra 7",
                    "ram_gb": 16,
                    "storage_gb": 1024,
                    "display_size_inches": "14.0",
                    "graphics": "",
                },
            },
            format="json",
        ).status_code
        == 403
    )

    client.force_authenticate(admin)
    product_response = client.post(
        "/api/v1/catalog/admin/products/",
        {
            "category": category.id,
            "product_type": "laptop",
            "name": "Admin product",
            "slug": "admin-product",
            "sku": "ADMIN-001",
            "price": "1000000",
            "stock_quantity": 2,
            "status": "published",
            "laptop_specification": {
                "processor": "Core Ultra 7",
                "ram_gb": 16,
                "storage_gb": 1024,
                "display_size_inches": "14.0",
                "graphics": "",
            },
        },
        format="json",
    )
    reviews_response = client.get(
        f"/api/v1/catalog/admin/products/{product.slug}/reviews/"
    )
    moderation_response = client.patch(
        f"/api/v1/catalog/admin/reviews/{review.id}/",
        {"moderation_status": "rejected"},
    )
    public_reviews = APIClient().get(
        f"/api/v1/catalog/products/{product.slug}/reviews/"
    )

    assert product_response.status_code == 201
    assert product_response.data["slug"] == "admin-product"
    assert reviews_response.status_code == 200
    assert reviews_response.data["results"][0]["moderation_status"] == "approved"
    assert moderation_response.status_code == 200
    assert moderation_response.data["moderation_status"] == "rejected"
    assert public_reviews.data["results"] == []


@pytest.mark.django_db
def test_admin_product_creation_accepts_type_details_and_multiple_images(
    tmp_path,
) -> None:
    category = Category.objects.create(name="Mobiles", slug="mobiles")
    admin = User.objects.create_user(
        phone="989198765432", role=User.Role.ADMIN, is_staff=True
    )
    client = APIClient()
    client.force_authenticate(admin)

    with override_settings(
        STORAGES={
            "default": {
                "BACKEND": "django.core.files.storage.FileSystemStorage",
                "OPTIONS": {"location": str(tmp_path)},
            }
        }
    ):
        response = client.post(
            "/api/v1/catalog/admin/products/",
            {
                "category": str(category.id),
                "product_type": "mobile",
                "name": "Admin mobile",
                "slug": "admin-mobile",
                "sku": "ADMIN-MOBILE-001",
                "price": "1000000",
                "stock_quantity": "2",
                "status": "draft",
                "mobile_specification.ram_gb": "12",
                "mobile_specification.storage_gb": "256",
                "mobile_specification.camera_megapixels": "50",
                "mobile_specification.network": "5g",
                "mobile_specification.battery_mah": "5000",
                "images": [
                    SimpleUploadedFile(
                        "front.jpg", b"front", content_type="image/jpeg"
                    ),
                    SimpleUploadedFile("back.jpg", b"back", content_type="image/jpeg"),
                ],
                "image_alt_text": "Product image",
            },
            format="multipart",
        )

    assert response.status_code == 201
    created = Product.objects.get(slug="admin-mobile")
    assert created.mobile_specification.ram_gb == 12
    assert list(created.images.values_list("alt_text", flat=True)) == [
        "Product image",
        "Product image",
    ]
