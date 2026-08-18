from datetime import timedelta
from unittest.mock import patch

import pytest
from django.contrib.auth.hashers import check_password, make_password
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import OTPChallenge, User
from apps.accounts.sms import SMSDelivery


@pytest.fixture(autouse=True)
def clear_cache() -> None:
    cache.clear()


@pytest.fixture
def client() -> APIClient:
    return APIClient()


@pytest.mark.django_db
@patch("apps.accounts.services.SmsIrBulkSender.send_otp")
@patch("apps.accounts.services._generate_code", return_value="123456")
def test_otp_request_normalizes_phone_and_creates_hashed_challenge(
    _generate_code, send_otp, client: APIClient
) -> None:
    send_otp.return_value = SMSDelivery(message_id="123")

    response = client.post("/api/v1/auth/otp/request/", {"phone": "۰۹۱۲۱۲۳۴۵۶۷"})

    assert response.status_code == 202
    challenge = OTPChallenge.objects.get()
    assert challenge.phone == "989121234567"
    assert check_password("123456", challenge.code_hash)
    send_otp.assert_called_once_with(phone="989121234567", code="123456")


@pytest.mark.django_db
@patch("apps.accounts.services.SmsIrBulkSender.send_otp")
def test_otp_request_enforces_per_phone_cooldown(send_otp, client: APIClient) -> None:
    send_otp.return_value = SMSDelivery(message_id="123")

    first = client.post("/api/v1/auth/otp/request/", {"phone": "09121234567"})
    second = client.post("/api/v1/auth/otp/request/", {"phone": "09121234567"})

    assert first.status_code == 202
    assert second.status_code == 429
    assert send_otp.call_count == 1


@pytest.mark.django_db
def test_otp_verify_creates_user_returns_tokens_and_authenticates(
    client: APIClient,
) -> None:
    OTPChallenge.objects.create(
        phone="989121234567",
        code_hash=make_password("123456"),
        expires_at=timezone.now() + timedelta(minutes=5),
    )

    response = client.post(
        "/api/v1/auth/otp/verify/", {"phone": "09121234567", "code": "123456"}
    )

    assert response.status_code == 200
    assert response.data["user"]["phone"] == "989121234567"
    assert User.objects.filter(phone="989121234567").exists()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
    assert client.get("/api/v1/auth/me/").status_code == 200


@pytest.mark.django_db
def test_current_user_can_set_a_display_name(client: APIClient) -> None:
    user = User.objects.create_user(phone="989121234567")
    client.force_authenticate(user=user)

    response = client.patch("/api/v1/auth/me/", {"display_name": "  سعید  "})

    assert response.status_code == 200
    assert response.data["display_name"] == "سعید"
    user.refresh_from_db()
    assert user.display_name == "سعید"


@pytest.mark.django_db
def test_current_user_can_update_profile_but_phone_is_read_only(
    client: APIClient,
) -> None:
    user = User.objects.create_user(phone="989121234567")
    client.force_authenticate(user=user)

    response = client.patch(
        "/api/v1/auth/me/",
        {
            "display_name": "سعید",
            "email": "SaEed@example.com ",
            "birth_date": "1995-04-12",
            "province": "Tehran",
            "city": "Tehran",
            "home_address": "Example street",
            "postal_code": "1234567890",
            "phone": "989199999999",
        },
    )

    assert response.status_code == 200
    assert response.data["phone"] == "989121234567"
    assert response.data["email"] == "saeed@example.com"
    assert response.data["postal_code"] == "1234567890"
    user.refresh_from_db()
    assert str(user.birth_date) == "1995-04-12"


@pytest.mark.django_db
def test_otp_verify_invalidates_challenge_after_maximum_attempts(
    client: APIClient,
) -> None:
    challenge = OTPChallenge.objects.create(
        phone="989121234567",
        code_hash=make_password("123456"),
        expires_at=timezone.now() + timedelta(minutes=5),
    )

    for _ in range(5):
        response = client.post(
            "/api/v1/auth/otp/verify/", {"phone": "09121234567", "code": "000000"}
        )
        assert response.status_code == 400

    challenge.refresh_from_db()
    assert challenge.attempts == 5
    assert challenge.invalidated_at is not None


@pytest.mark.django_db
def test_otp_request_rejects_invalid_phone(client: APIClient) -> None:
    response = client.post("/api/v1/auth/otp/request/", {"phone": "123"})

    assert response.status_code == 400


@pytest.mark.django_db
def test_admin_login_requires_an_administrator_and_returns_tokens(
    client: APIClient,
) -> None:
    User.objects.create_superuser(phone="989121234567", password="safe-password")

    response = client.post(
        "/api/v1/auth/admin/login/",
        {"phone": "989121234567", "password": "safe-password"},
    )

    assert response.status_code == 200
    assert response.data["access"]
    assert response.data["user"]["role"] == User.Role.ADMIN
