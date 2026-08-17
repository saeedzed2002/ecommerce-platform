import re

from django.core.exceptions import ValidationError

PERSIAN_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")
IRANIAN_MOBILE_RE = re.compile(r"^989\d{9}$")


def normalize_iranian_mobile(value: str) -> str:
    phone = value.translate(PERSIAN_DIGITS).strip().replace(" ", "").replace("-", "")
    phone = phone.removeprefix("+")
    phone = phone.removeprefix("00")
    if phone.startswith("0"):
        phone = f"98{phone[1:]}"

    if not IRANIAN_MOBILE_RE.fullmatch(phone):
        raise ValidationError("Enter a valid Iranian mobile number.")
    return phone
