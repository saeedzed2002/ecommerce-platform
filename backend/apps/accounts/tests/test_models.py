import pytest

from apps.accounts.models import User


@pytest.mark.django_db
def test_user_manager_creates_customer_with_unusable_password() -> None:
    user = User.objects.create_user(phone="09121234567")

    assert user.role == User.Role.CUSTOMER
    assert user.has_usable_password() is False
    assert user.is_staff is False


@pytest.mark.django_db
def test_user_manager_creates_admin_superuser() -> None:
    user = User.objects.create_superuser(phone="09121234567", password="safe-password")

    assert user.role == User.Role.ADMIN
    assert user.is_staff is True
    assert user.is_superuser is True
    assert user.check_password("safe-password") is True


@pytest.mark.django_db
def test_user_manager_rejects_missing_phone() -> None:
    with pytest.raises(ValueError, match="phone number"):
        User.objects.create_user(phone="")
