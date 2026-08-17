from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

import pytest
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.catalog.models import Category, Product
from apps.orders.models import Order, OrderItem, PaymentAttempt
from apps.orders.payments import ZarinpalVerification
from apps.orders.tasks import expire_pending_orders


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
        stock_quantity=2,
        status=Product.Status.PUBLISHED,
    )


@pytest.fixture
def order(user: User, product: Product) -> Order:
    order = Order.objects.create(
        user=user,
        subtotal=Decimal(500000),
        expires_at=timezone.now() + timedelta(minutes=15),
        shipping_full_name="Test User",
        shipping_phone="989121234567",
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
        quantity=2,
    )
    return order


@pytest.mark.django_db
@override_settings(ZARINPAL_MERCHANT_ID="00000000-0000-0000-0000-000000000000")
@patch(
    "apps.orders.payments.ZarinpalGateway.request_payment",
    return_value="S0000000000000000000000000000",
)
def test_payment_start_creates_a_sandbox_attempt(
    request_payment, client: APIClient, order: Order
) -> None:
    response = client.post(f"/api/v1/orders/{order.number}/payment/")

    assert response.status_code == 201
    assert response.data["authorization_url"].endswith(
        "/pg/StartPay/S0000000000000000000000000000"
    )
    attempt = PaymentAttempt.objects.get(order=order)
    assert attempt.status == PaymentAttempt.Status.REQUESTED
    assert attempt.amount == 500000
    request_payment.assert_called_once()


@pytest.mark.django_db
@override_settings(FRONTEND_URL="http://frontend.test")
@patch(
    "apps.orders.payments.ZarinpalGateway.verify_payment",
    return_value=ZarinpalVerification(reference_id="123456"),
)
def test_zarinpal_callback_verifies_payment_and_redirects(
    verify_payment, order: Order
) -> None:
    PaymentAttempt.objects.create(
        order=order,
        provider=PaymentAttempt.Provider.ZARINPAL,
        status=PaymentAttempt.Status.REQUESTED,
        amount=500000,
        authority="S0000000000000000000000000000",
    )
    client = APIClient()

    response = client.get(
        "/api/v1/orders/payments/zarinpal/callback/"
        "?Authority=S0000000000000000000000000000&Status=OK"
    )

    assert response.status_code == 302
    assert response["Location"].startswith(
        f"http://frontend.test/payment-result?status=paid&order={order.number}"
    )
    order.refresh_from_db()
    assert order.status == Order.Status.PAID
    attempt = PaymentAttempt.objects.get(order=order)
    assert attempt.status == PaymentAttempt.Status.VERIFIED
    assert attempt.reference_id == "123456"
    verify_payment.assert_called_once()


@pytest.mark.django_db
def test_expiring_pending_order_restores_stock(order: Order, product: Product) -> None:
    order.expires_at = timezone.now() - timedelta(seconds=1)
    order.save(update_fields=["expires_at"])
    PaymentAttempt.objects.create(
        order=order,
        provider=PaymentAttempt.Provider.ZARINPAL,
        status=PaymentAttempt.Status.REQUESTED,
        amount=500000,
        authority="S0000000000000000000000000000",
    )

    assert expire_pending_orders() == 1

    order.refresh_from_db()
    product.refresh_from_db()
    assert order.status == Order.Status.EXPIRED
    assert product.stock_quantity == 4
    assert (
        PaymentAttempt.objects.get(order=order).status == PaymentAttempt.Status.EXPIRED
    )
