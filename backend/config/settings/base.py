from datetime import timedelta
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent.parent
PROJECT_ROOT = BASE_DIR.parent
env = environ.Env(DJANGO_DEBUG=(bool, False))
for env_file in (PROJECT_ROOT / ".env", BASE_DIR / ".env"):
    if env_file.is_file():
        environ.Env.read_env(env_file, overwrite=False)

SECRET_KEY = env("DJANGO_SECRET_KEY", default="unsafe-development-key")
DEBUG = env("DJANGO_DEBUG")
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

if not DEBUG and SECRET_KEY == "unsafe-development-key":
    raise RuntimeError("DJANGO_SECRET_KEY must be set when DJANGO_DEBUG is false")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "channels",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "apps.accounts",
    "apps.catalog",
    "apps.cart",
    "apps.orders",
    "apps.chat",
]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
ROOT_URLCONF = "config.urls"
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"
DATABASES = {
    "default": env.db(default="postgres://ecommerce:change-me@postgres:5432/ecommerce")
}
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.User"
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS", default=["http://localhost:5173"]
)
REST_FRAMEWORK = {
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 12,
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_THROTTLE_RATES": {"otp": "10/hour", "admin_login": "5/hour"},
}
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": env("CACHE_URL", default="redis://redis:6379/2"),
    }
}
OTP_CODE_LENGTH = 6
OTP_CODE_TTL_SECONDS = 5 * 60
OTP_RESEND_COOLDOWN_SECONDS = 60
OTP_MAX_VERIFY_ATTEMPTS = 5
SMSIR_API_KEY = env("SMSIR_API_KEY", default="")
SMSIR_LINE_NUMBER = env("SMSIR_LINE_NUMBER", default="")
SMSIR_BULK_ENDPOINT = env(
    "SMSIR_BULK_ENDPOINT", default="https://api.sms.ir/v1/send/bulk"
)
ZARINPAL_MERCHANT_ID = env("ZARINPAL_MERCHANT_ID", default="")
ZARINPAL_SANDBOX = env.bool("ZARINPAL_SANDBOX", default=True)
ZARINPAL_CALLBACK_URL = env(
    "ZARINPAL_CALLBACK_URL",
    default="http://localhost:8000/api/v1/orders/payments/zarinpal/callback/",
)
ZARINPAL_REQUEST_TIMEOUT_SECONDS = env.int(
    "ZARINPAL_REQUEST_TIMEOUT_SECONDS", default=10
)
FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:5173")
ORDER_PAYMENT_RESERVATION_MINUTES = env.int(
    "ORDER_PAYMENT_RESERVATION_MINUTES", default=15
)
SHIPPING_FLAT_RATE = env.int("SHIPPING_FLAT_RATE", default=0)
SHIPPING_FREE_THRESHOLD = env.int("SHIPPING_FREE_THRESHOLD", default=0)
TAX_RATE_PERCENT = env.int("TAX_RATE_PERCENT", default=0)
STORAGES = {
    "default": {
        "BACKEND": "storages.backends.s3.S3Storage",
        "OPTIONS": {
            "access_key": env("MINIO_ROOT_USER", default="ecommerce-minio"),
            "secret_key": env(
                "MINIO_ROOT_PASSWORD", default="change-me-minio-password"
            ),
            "bucket_name": env("MINIO_BUCKET_NAME", default="ecommerce-media"),
            "endpoint_url": env("MINIO_ENDPOINT_URL", default="http://minio:9000"),
            "region_name": env("MINIO_REGION", default="us-east-1"),
            "addressing_style": "path",
            "custom_domain": env(
                "MINIO_PUBLIC_DOMAIN", default="localhost:9000/ecommerce-media"
            ),
            "url_protocol": env("MINIO_PUBLIC_URL_PROTOCOL", default="http:"),
            "querystring_auth": False,
            "file_overwrite": False,
        },
    },
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [
                {
                    "address": env("REDIS_URL", default="redis://redis:6379/0"),
                    # `channels_redis` uses a blocking Redis read while waiting for
                    # channel events. Keep that read open; Redis client 8 defaults
                    # socket_timeout to five seconds, which disconnects WebSockets.
                    "socket_timeout": None,
                    "socket_connect_timeout": 5,
                }
            ]
        },
    }
}
CELERY_BROKER_URL = env(
    "CELERY_BROKER_URL", default="amqp://ecommerce:change-me@rabbitmq:5672/ecommerce"
)
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND", default="redis://redis:6379/1")
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60
CELERY_BEAT_SCHEDULE = {
    "expire-pending-orders": {
        "task": "apps.orders.tasks.expire_pending_orders",
        "schedule": 60.0,
    }
}
