from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.cart.models import Cart, CartItem
from apps.catalog.models import Category, Product
from apps.orders.models import Address, Order


@pytest.fixture
def user() -> User:
    return User.objects.create_user(phone="989121234567")


@pytest.fixture
def client(user: User) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def product() -> Product:
    category = Category.objects.create(name="Catalog", slug="catalog")
    return Product.objects.create(
        category=category,
        name="Product",
        slug="product",
        sku="SKU-PRODUCT",
        price=Decimal(250000),
        stock_quantity=4,
        status=Product.Status.PUBLISHED,
    )


@pytest.fixture
def address(user: User) -> Address:
    return Address.objects.create(
        user=user,
        full_name="Test User",
        phone="989121234567",
        province="Tehran",
        city="Tehran",
        address_line="Street",
        postal_code="1234567890",
    )


@pytest.mark.django_db
def test_checkout_creates_price_snapshot_reduces_stock_and_keeps_cart_until_payment(
    client: APIClient, user: User, product: Product, address: Address
) -> None:
    cart = Cart.objects.create(user=user)
    CartItem.objects.create(cart=cart, product=product, quantity=2)

    response = client.post("/api/v1/orders/checkout/", {"address_id": address.id})

    assert response.status_code == 201
    assert response.data["subtotal"] == "500000"
    assert response.data["items"][0]["product_name"] == "Product"
    assert CartItem.objects.count() == 1
    product.refresh_from_db()
    assert product.stock_quantity == 2


@pytest.mark.django_db
def test_checkout_reuses_pending_order_without_reserving_stock_twice(
    client: APIClient, user: User, product: Product, address: Address
) -> None:
    cart = Cart.objects.create(user=user)
    CartItem.objects.create(cart=cart, product=product, quantity=2)

    first = client.post("/api/v1/orders/checkout/", {"address_id": address.id})
    second = client.post("/api/v1/orders/checkout/", {"address_id": address.id})

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.data["number"] == second.data["number"]
    assert Order.objects.count() == 1
    product.refresh_from_db()
    assert product.stock_quantity == 2


@pytest.mark.django_db
def test_checkout_rejects_another_users_address(
    client: APIClient, user: User, product: Product
) -> None:
    cart = Cart.objects.create(user=user)
    CartItem.objects.create(cart=cart, product=product)
    other = User.objects.create_user(phone="989121234568")
    address = Address.objects.create(
        user=other,
        full_name="Other",
        phone="989121234568",
        province="Tehran",
        city="Tehran",
        address_line="Street",
        postal_code="1234567890",
    )

    response = client.post("/api/v1/orders/checkout/", {"address_id": address.id})

    assert response.status_code == 400
    assert Order.objects.count() == 0
    assert CartItem.objects.count() == 1


@pytest.mark.django_db
def test_address_list_returns_only_the_authenticated_users_addresses(
    client: APIClient, user: User, address: Address
) -> None:
    other = User.objects.create_user(phone="989121234568")
    Address.objects.create(
        user=other,
        full_name="Other User",
        phone="989121234568",
        province="Tehran",
        city="Tehran",
        address_line="Other street",
        postal_code="1234567891",
    )

    response = client.get("/api/v1/orders/addresses/")

    assert response.status_code == 200
    assert response.data == [
        {
            "id": address.id,
            "full_name": "Test User",
            "phone": "989121234567",
            "province": "Tehran",
            "city": "Tehran",
            "address_line": "Street",
            "postal_code": "1234567890",
            "is_default": False,
        }
    ]


@pytest.mark.django_db
def test_creating_a_default_address_replaces_the_previous_default(
    client: APIClient, address: Address
) -> None:
    address.is_default = True
    address.save(update_fields=["is_default"])

    response = client.post(
        "/api/v1/orders/addresses/",
        {
            "full_name": "New Default",
            "phone": "09121234567",
            "province": "Tehran",
            "city": "Tehran",
            "address_line": "New street",
            "postal_code": "1234567891",
            "is_default": True,
        },
    )

    assert response.status_code == 201
    assert response.data["phone"] == "989121234567"
    address.refresh_from_db()
    assert address.is_default is False
    assert Address.objects.get(pk=response.data["id"]).is_default is True


@pytest.mark.django_db
def test_address_rejects_an_invalid_mobile_number(client: APIClient) -> None:
    response = client.post(
        "/api/v1/orders/addresses/",
        {
            "full_name": "Invalid Phone",
            "phone": "123",
            "province": "Tehran",
            "city": "Tehran",
            "address_line": "Street",
            "postal_code": "1234567891",
        },
    )

    assert response.status_code == 400
    assert "phone" in response.data


@pytest.mark.django_db
def test_checkout_does_not_oversell(
    client: APIClient, user: User, product: Product, address: Address
) -> None:
    cart = Cart.objects.create(user=user)
    CartItem.objects.create(cart=cart, product=product, quantity=4)
    product.stock_quantity = 3
    product.save(update_fields=["stock_quantity"])

    response = client.post("/api/v1/orders/checkout/", {"address_id": address.id})

    assert response.status_code == 400
    assert Order.objects.count() == 0
    assert CartItem.objects.count() == 1


@pytest.mark.django_db
def test_orders_are_visible_only_to_owner(
    client: APIClient, user: User, product: Product, address: Address
) -> None:
    cart = Cart.objects.create(user=user)
    CartItem.objects.create(cart=cart, product=product)
    client.post("/api/v1/orders/checkout/", {"address_id": address.id})
    other = User.objects.create_user(phone="989121234568")
    other_client = APIClient()
    other_client.force_authenticate(user=other)

    assert len(client.get("/api/v1/orders/").data["results"]) == 1
    assert other_client.get("/api/v1/orders/").data["results"] == []
