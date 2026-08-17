import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone

from .models import OTPChallenge, User
from .sms import SmsIrBulkSender, SMSProviderError


class OTPRateLimited(Exception):
    pass


class OTPInvalid(Exception):
    pass


def _cooldown_key(phone: str) -> str:
    return f"accounts:otp:cooldown:{phone}"


def _generate_code() -> str:
    return str(secrets.randbelow(900_000) + 100_000)


def request_otp(*, phone: str, sender: SmsIrBulkSender | None = None) -> None:
    cooldown_key = _cooldown_key(phone)
    if not cache.add(cooldown_key, True, settings.OTP_RESEND_COOLDOWN_SECONDS):
        raise OTPRateLimited

    code = _generate_code()
    try:
        delivery = (sender or SmsIrBulkSender()).send_otp(phone=phone, code=code)
    except SMSProviderError:
        cache.delete(cooldown_key)
        raise

    OTPChallenge.objects.create(
        phone=phone,
        code_hash=make_password(code),
        expires_at=timezone.now() + timedelta(seconds=settings.OTP_CODE_TTL_SECONDS),
        provider_message_id=delivery.message_id,
    )


def verify_otp(*, phone: str, code: str) -> User:
    verified_user: User | None = None
    invalid = False
    with transaction.atomic():
        challenge = (
            OTPChallenge.objects.select_for_update()
            .filter(phone=phone)
            .order_by("-created_at")
            .first()
        )
        now = timezone.now()
        if (
            challenge is None
            or challenge.verified_at is not None
            or challenge.invalidated_at is not None
            or challenge.expires_at <= now
        ):
            invalid = True
        elif not check_password(code, challenge.code_hash):
            challenge.attempts += 1
            update_fields = ["attempts"]
            if challenge.attempts >= settings.OTP_MAX_VERIFY_ATTEMPTS:
                challenge.invalidated_at = now
                update_fields.append("invalidated_at")
            challenge.save(update_fields=update_fields)
            invalid = True
        else:
            challenge.attempts += 1
            challenge.verified_at = now
            challenge.save(update_fields=["attempts", "verified_at"])
            user, _ = User.objects.get_or_create(phone=phone)
            if user.is_active:
                verified_user = user
            else:
                invalid = True

    if invalid or verified_user is None:
        raise OTPInvalid
    return verified_user
