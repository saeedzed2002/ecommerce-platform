from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.cart.models import CartItem
from apps.catalog.models import Category, Product
from apps.orders.models import Order


@pytest.fixture
def user() -> User:
    return User.objects.create_user(phone="989121234567")


@pytest.fixture
def product() -> Product:
    category = Category.objects.create(name="Catalog", slug="catalog")
    return Product.objects.create(
        category=category,
        name="Product",
        slug="product",
        sku="SKU-PRODUCT",
        price=Decimal(250000),
        stock_quantity=3,
        status=Product.Status.PUBLISHED,
    )


@pytest.fixture
def client(user: User) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
def test_cart_is_created_for_authenticated_user(client: APIClient) -> None:
    response = client.get("/api/v1/cart/")

    assert response.status_code == 200
    assert response.data["items"] == []
    assert response.data["item_count"] == 0
    assert response.data["subtotal"] == 0


@pytest.mark.django_db
def test_cart_item_can_be_added_and_quantity_is_accumulated(
    client: APIClient, product: Product
) -> None:
    first = client.post(
        "/api/v1/cart/items/", {"product_id": product.id, "quantity": 1}
    )
    second = client.post(
        "/api/v1/cart/items/", {"product_id": product.id, "quantity": 2}
    )

    assert first.status_code == 201
    assert second.status_code == 201
    assert second.data["item_count"] == 3
    assert second.data["subtotal"] == Decimal(750000)
    assert CartItem.objects.get().quantity == 3


@pytest.mark.django_db
def test_cart_rejects_quantities_above_stock(
    client: APIClient, product: Product
) -> None:
    response = client.post(
        "/api/v1/cart/items/", {"product_id": product.id, "quantity": 4}
    )

    assert response.status_code == 400
    assert CartItem.objects.count() == 0


@pytest.mark.django_db
def test_cart_item_can_be_updated_and_deleted(
    client: APIClient, product: Product
) -> None:
    created = client.post("/api/v1/cart/items/", {"product_id": product.id})
    item_id = created.data["items"][0]["id"]

    updated = client.patch(f"/api/v1/cart/items/{item_id}/", {"quantity": 2})
    deleted = client.delete(f"/api/v1/cart/items/{item_id}/")

    assert updated.status_code == 200
    assert updated.data["items"][0]["quantity"] == 2
    assert deleted.status_code == 200
    assert deleted.data["items"] == []


@pytest.mark.django_db
def test_cart_does_not_expose_or_mutate_other_users_items(
    client: APIClient, product: Product
) -> None:
    other_user = User.objects.create_user(phone="989121234568")
    other_client = APIClient()
    other_client.force_authenticate(user=other_user)
    created = other_client.post("/api/v1/cart/items/", {"product_id": product.id})
    item_id = created.data["items"][0]["id"]

    response = client.patch(f"/api/v1/cart/items/{item_id}/", {"quantity": 2})

    assert response.status_code == 404
    assert CartItem.objects.get(pk=item_id).quantity == 1


@pytest.mark.django_db
def test_cart_requires_authentication(product: Product) -> None:
    response = APIClient().post("/api/v1/cart/items/", {"product_id": product.id})

    assert response.status_code == 401


@pytest.mark.django_db
def test_cart_cannot_change_while_payment_is_pending(
    client: APIClient, user: User, product: Product
) -> None:
    Order.objects.create(
        user=user,
        subtotal=Decimal(250000),
        expires_at=timezone.now() + timedelta(minutes=15),
        shipping_full_name="Test User",
        shipping_phone="989121234567",
        shipping_province="Tehran",
        shipping_city="Tehran",
        shipping_address_line="Street",
        shipping_postal_code="1234567890",
    )

    response = client.post("/api/v1/cart/items/", {"product_id": product.id})

    assert response.status_code == 400
    assert CartItem.objects.count() == 0
