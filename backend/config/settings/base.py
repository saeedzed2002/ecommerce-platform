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
    "apps.accounts",
    "apps.catalog",
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
}
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
        "CONFIG": {"hosts": [env("REDIS_URL", default="redis://redis:6379/0")]},
    }
}
CELERY_BROKER_URL = env(
    "CELERY_BROKER_URL", default="amqp://ecommerce:change-me@rabbitmq:5672/ecommerce"
)
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND", default="redis://redis:6379/1")
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60
