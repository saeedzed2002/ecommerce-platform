from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.catalog.models import Category, Product
from apps.orders.models import Order, OrderItem, PaymentAttempt


@pytest.fixture
def admin() -> User:
    return User.objects.create_user(
        phone="989121234500",
        role=User.Role.ADMIN,
        is_staff=True,
    )


@pytest.fixture
def customer() -> User:
    return User.objects.create_user(phone="989121234501")


@pytest.fixture
def admin_client(admin: User) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=admin)
    return client


@pytest.fixture
def customer_client(customer: User) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=customer)
    return client


@pytest.fixture
def paid_order(customer: User) -> Order:
    category = Category.objects.create(name="Catalog", slug="catalog")
    product = Product.objects.create(
        category=category,
        name="Product",
        slug="product",
        sku="SKU-PRODUCT",
        price=Decimal(250000),
        stock_quantity=2,
        status=Product.Status.PUBLISHED,
    )
    order = Order.objects.create(
        user=customer,
        status=Order.Status.PAID,
        subtotal=Decimal(250000),
        shipping_full_name="Test User",
        shipping_phone=customer.phone,
        shipping_province="Tehran",
        shipping_city="Tehran",
        shipping_address_line="Street",
        shipping_postal_code="1234567890",
    )
    OrderItem.objects.create(
        order=order,
        product=product,
        product_name=product.name,
        product_sku=product.sku,
        unit_price=product.price,
        quantity=1,
    )
    return order


@pytest.mark.django_db
def test_customer_cannot_access_admin_orders(
    customer_client: APIClient, paid_order: Order
) -> None:
    response = customer_client.get("/api/v1/orders/admin/")

    assert response.status_code == 403


@pytest.mark.django_db
def test_admin_lists_and_filters_orders(
    admin_client: APIClient, customer: User, paid_order: Order
) -> None:
    response = admin_client.get(
        f"/api/v1/orders/admin/?status=paid&query={customer.phone}"
    )

    assert response.status_code == 200
    assert response.data["count"] == 1
    assert response.data["results"][0]["number"] == str(paid_order.number)
    assert response.data["results"][0]["customer_phone"] == customer.phone


@pytest.mark.django_db
def test_admin_can_move_paid_order_through_fulfilment(
    admin_client: APIClient, paid_order: Order
) -> None:
    processing = admin_client.patch(
        f"/api/v1/orders/admin/{paid_order.number}/status/",
        {"status": "processing"},
    )
    shipped = admin_client.patch(
        f"/api/v1/orders/admin/{paid_order.number}/status/",
        {"status": "shipped"},
    )

    assert processing.status_code == 200
    assert processing.data["status"] == Order.Status.PROCESSING
    assert shipped.status_code == 200
    assert shipped.data["status"] == Order.Status.SHIPPED


@pytest.mark.django_db
def test_admin_cannot_cancel_a_paid_order_without_a_refund_workflow(
    admin_client: APIClient, paid_order: Order
) -> None:
    response = admin_client.patch(
        f"/api/v1/orders/admin/{paid_order.number}/status/",
        {"status": "cancelled"},
    )

    assert response.status_code == 400
    paid_order.refresh_from_db()
    assert paid_order.status == Order.Status.PAID


@pytest.mark.django_db
def test_admin_can_cancel_pending_order_and_restore_reserved_stock(
    admin_client: APIClient, customer: User
) -> None:
    category = Category.objects.create(name="Catalog", slug="catalog")
    product = Product.objects.create(
        category=category,
        name="Product",
        slug="product",
        sku="SKU-PRODUCT",
        price=Decimal(250000),
        stock_quantity=1,
        status=Product.Status.PUBLISHED,
    )
    order = Order.objects.create(
        user=customer,
        subtotal=Decimal(250000),
        shipping_full_name="Test User",
        shipping_phone=customer.phone,
        shipping_province="Tehran",
        shipping_city="Tehran",
        shipping_address_line="Street",
        shipping_postal_code="1234567890",
    )
    OrderItem.objects.create(
        order=order,
        product=product,
        product_name=product.name,
        product_sku=product.sku,
        unit_price=product.price,
        quantity=1,
    )
    attempt = PaymentAttempt.objects.create(
        order=order,
        provider=PaymentAttempt.Provider.ZARINPAL,
        status=PaymentAttempt.Status.REQUESTED,
        amount=250000,
        authority="S0000000000000000000000000000",
    )

    response = admin_client.patch(
        f"/api/v1/orders/admin/{order.number}/status/",
        {"status": "cancelled"},
    )

    assert response.status_code == 200
    assert response.data["status"] == Order.Status.CANCELLED
    product.refresh_from_db()
    attempt.refresh_from_db()
    assert product.stock_quantity == 2
    assert attempt.status == PaymentAttempt.Status.FAILED


@pytest.mark.django_db
def test_admin_cannot_manually_mark_pending_order_as_paid(
    admin_client: APIClient, customer: User
) -> None:
    order = Order.objects.create(
        user=customer,
        subtotal=Decimal(250000),
        shipping_full_name="Test User",
        shipping_phone=customer.phone,
        shipping_province="Tehran",
        shipping_city="Tehran",
        shipping_address_line="Street",
        shipping_postal_code="1234567890",
    )

    response = admin_client.patch(
        f"/api/v1/orders/admin/{order.number}/status/",
        {"status": "paid"},
    )

    assert response.status_code == 400
