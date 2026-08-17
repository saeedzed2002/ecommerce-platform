import os
from copy import deepcopy

os.environ.setdefault("DJANGO_SECRET_KEY", "test-only-secret-key")

from .base import *

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    },
}

STORAGES = deepcopy(STORAGES)
STORAGES["default"]["OPTIONS"].update(
    {
        "custom_domain": "minio.test/ecommerce-media",
        "url_protocol": "https:",
    },
)
