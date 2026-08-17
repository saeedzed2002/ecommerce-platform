import os
from copy import deepcopy

os.environ.setdefault(
    "DJANGO_SECRET_KEY", "test-only-secret-key-with-at-least-32-bytes"
)

from .base import *

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    },
}
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "otp-tests",
    }
}

STORAGES = deepcopy(STORAGES)
STORAGES["default"]["OPTIONS"].update(
    {
        "custom_domain": "minio.test/ecommerce-media",
        "url_protocol": "https:",
    },
)
SIMPLE_JWT = deepcopy(SIMPLE_JWT)
SIMPLE_JWT["SIGNING_KEY"] = "test-jwt-signing-key-with-at-least-32-bytes"
