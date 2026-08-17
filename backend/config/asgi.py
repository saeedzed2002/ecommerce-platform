import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.base")

from channels.routing import ProtocolTypeRouter, URLRouter
from django.conf import settings
from django.contrib.staticfiles.handlers import ASGIStaticFilesHandler
from django.core.asgi import get_asgi_application

django_asgi_app = get_asgi_application()
http_application = (
    ASGIStaticFilesHandler(django_asgi_app) if settings.DEBUG else django_asgi_app
)

from apps.chat.realtime import JwtAuthMiddleware
from apps.chat.routing import websocket_urlpatterns

application = ProtocolTypeRouter(
    {
        "http": http_application,
        "websocket": JwtAuthMiddleware(URLRouter(websocket_urlpatterns)),
    }
)
