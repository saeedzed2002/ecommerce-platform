from dataclasses import dataclass
from typing import Any

import requests
from django.conf import settings


class SMSProviderError(Exception):
    pass


@dataclass(frozen=True)
class SMSDelivery:
    message_id: str


class SmsIrBulkSender:
    timeout_seconds = 10

    def send_otp(self, *, phone: str, code: str) -> SMSDelivery:
        if not settings.SMSIR_API_KEY or not settings.SMSIR_LINE_NUMBER:
            raise SMSProviderError("SMS.ir is not configured.")

        payload = {
            "lineNumber": int(settings.SMSIR_LINE_NUMBER),
            "messageText": f"کد ورود شما به نوکسا: {code}\nاعتبار کد: ۵ دقیقه",
            "mobiles": [phone],
        }
        try:
            response = requests.post(
                settings.SMSIR_BULK_ENDPOINT,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "X-API-KEY": settings.SMSIR_API_KEY,
                },
                json=payload,
                timeout=self.timeout_seconds,
            )
            response.raise_for_status()
            body: dict[str, Any] = response.json()
        except (requests.RequestException, ValueError) as error:
            raise SMSProviderError("SMS provider request failed.") from error

        if body.get("status") != 1:
            raise SMSProviderError("SMS provider rejected the request.")

        data = body.get("data") or {}
        message_ids = data.get("messageIds") or []
        if not message_ids or not message_ids[0]:
            raise SMSProviderError("SMS provider did not accept the recipient.")
        return SMSDelivery(message_id=str(message_ids[0]))
