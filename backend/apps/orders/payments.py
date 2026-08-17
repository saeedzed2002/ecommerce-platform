from dataclasses import dataclass
from urllib.parse import urlencode

import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from apps.cart.models import CartItem

from .models import Order, OrderStatusEvent, PaymentAttempt


class ZarinpalGatewayError(Exception):
    pass


@dataclass(frozen=True)
class ZarinpalVerification:
    reference_id: str


class ZarinpalGateway:
    def __init__(self) -> None:
        self.merchant_id = settings.ZARINPAL_MERCHANT_ID
        self.base_url = (
            "https://sandbox.zarinpal.com"
            if settings.ZARINPAL_SANDBOX
            else "https://payment.zarinpal.com"
        )

    def _post(self, path: str, payload: dict) -> dict:
        if not self.merchant_id:
            raise ZarinpalGatewayError("Zarinpal merchant ID is not configured.")
        try:
            response = requests.post(
                f"{self.base_url}{path}",
                json=payload,
                headers={"Accept": "application/json"},
                timeout=settings.ZARINPAL_REQUEST_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
            body = response.json()
        except (requests.RequestException, ValueError) as error:
            raise ZarinpalGatewayError("Zarinpal request failed.") from error
        if not isinstance(body, dict):
            raise ZarinpalGatewayError("Zarinpal returned an invalid response.")
        return body

    def request_payment(
        self, *, amount: int, description: str, mobile: str, order_number: str
    ) -> str:
        body = self._post(
            "/pg/v4/payment/request.json",
            {
                "merchant_id": self.merchant_id,
                "amount": amount,
                "currency": "IRT",
                "description": description,
                "callback_url": settings.ZARINPAL_CALLBACK_URL,
                "metadata": {"mobile": mobile, "order_id": order_number},
            },
        )
        data = body.get("data") or {}
        authority = data.get("authority")
        if data.get("code") != 100 or not isinstance(authority, str):
            raise ZarinpalGatewayError("Zarinpal did not create a payment authority.")
        if settings.ZARINPAL_SANDBOX and not authority.startswith("S"):
            raise ZarinpalGatewayError("Zarinpal sandbox authority is invalid.")
        return authority

    def verify_payment(self, *, amount: int, authority: str) -> ZarinpalVerification:
        body = self._post(
            "/pg/v4/payment/verify.json",
            {
                "merchant_id": self.merchant_id,
                "amount": amount,
                "authority": authority,
            },
        )
        data = body.get("data") or {}
        if data.get("code") not in (100, 101):
            raise ZarinpalGatewayError("Zarinpal did not verify the payment.")
        return ZarinpalVerification(reference_id=str(data.get("ref_id", "")))

    def payment_url(self, authority: str) -> str:
        return f"{self.base_url}/pg/StartPay/{authority}"


@dataclass(frozen=True)
class PaymentStart:
    order: Order
    authorization_url: str


@dataclass(frozen=True)
class PaymentVerification:
    order: Order
    paid: bool
    reference_id: str


def start_zarinpal_payment(*, user, order_number) -> PaymentStart:
    gateway = ZarinpalGateway()
    with transaction.atomic():
        get_user_model().objects.select_for_update().get(pk=user.pk)
        order = (
            Order.objects.select_for_update()
            .filter(number=order_number, user=user)
            .first()
        )
        if order is None:
            raise NotFound("Order not found.")
        if order.status != Order.Status.PENDING:
            raise ValidationError({"detail": "This order is not awaiting payment."})
        if order.expires_at is not None and order.expires_at <= timezone.now():
            raise ValidationError({"detail": "This order has expired."})
        attempt = (
            PaymentAttempt.objects.select_for_update()
            .filter(order=order, provider=PaymentAttempt.Provider.ZARINPAL)
            .order_by("-created_at")
            .first()
        )
        if attempt and attempt.status == PaymentAttempt.Status.REQUESTED:
            return PaymentStart(
                order=order, authorization_url=gateway.payment_url(attempt.authority)
            )
        attempt = PaymentAttempt.objects.create(
            order=order,
            provider=PaymentAttempt.Provider.ZARINPAL,
            amount=int(order.subtotal),
        )

    try:
        authority = gateway.request_payment(
            amount=attempt.amount,
            description=f"Order {order.number}",
            mobile=order.shipping_phone,
            order_number=str(order.number),
        )
    except ZarinpalGatewayError as error:
        PaymentAttempt.objects.filter(pk=attempt.pk).update(
            status=PaymentAttempt.Status.FAILED, failure_reason=str(error)
        )
        raise ValidationError({"detail": "Unable to start payment."}) from error

    PaymentAttempt.objects.filter(pk=attempt.pk).update(
        authority=authority, status=PaymentAttempt.Status.REQUESTED
    )
    return PaymentStart(order=order, authorization_url=gateway.payment_url(authority))


def verify_zarinpal_payment(*, authority: str) -> PaymentVerification:
    attempt = (
        PaymentAttempt.objects.select_related("order")
        .filter(
            authority=authority,
            provider=PaymentAttempt.Provider.ZARINPAL,
        )
        .first()
    )
    if attempt is None:
        raise NotFound("Payment authority not found.")
    if attempt.status == PaymentAttempt.Status.VERIFIED:
        return PaymentVerification(
            order=attempt.order, paid=True, reference_id=attempt.reference_id
        )

    gateway = ZarinpalGateway()
    try:
        verification = gateway.verify_payment(
            amount=attempt.amount, authority=authority
        )
    except ZarinpalGatewayError as error:
        PaymentAttempt.objects.filter(pk=attempt.pk).update(
            status=PaymentAttempt.Status.FAILED, failure_reason=str(error)
        )
        return PaymentVerification(order=attempt.order, paid=False, reference_id="")

    with transaction.atomic():
        attempt = (
            PaymentAttempt.objects.select_for_update()
            .select_related("order")
            .get(pk=attempt.pk)
        )
        order = Order.objects.select_for_update().get(pk=attempt.order_id)
        get_user_model().objects.select_for_update().get(pk=order.user_id)
        if order.status == Order.Status.PAID:
            return PaymentVerification(
                order=order, paid=True, reference_id=attempt.reference_id
            )
        if order.status != Order.Status.PENDING:
            attempt.status = PaymentAttempt.Status.FAILED
            attempt.failure_reason = "Order is no longer payable."
            attempt.save(update_fields=["status", "failure_reason", "updated_at"])
            return PaymentVerification(order=order, paid=False, reference_id="")
        order.status = Order.Status.PAID
        order.save(update_fields=["status", "updated_at"])
        OrderStatusEvent.objects.create(
            order=order,
            from_status=Order.Status.PENDING,
            to_status=Order.Status.PAID,
        )
        CartItem.objects.select_for_update().filter(
            cart__user_id=order.user_id
        ).delete()
        attempt.status = PaymentAttempt.Status.VERIFIED
        attempt.reference_id = verification.reference_id
        attempt.failure_reason = ""
        attempt.save(
            update_fields=["status", "reference_id", "failure_reason", "updated_at"]
        )
    return PaymentVerification(
        order=order, paid=True, reference_id=verification.reference_id
    )


def payment_result_url(
    *, status: str, order_number: str, reference_id: str = ""
) -> str:
    query = urlencode({"status": status, "order": order_number, "ref_id": reference_id})
    return f"{settings.FRONTEND_URL.rstrip('/')}/payment-result?{query}"
