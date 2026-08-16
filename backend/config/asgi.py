import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.base")

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        # apps.chat.routing will provide authenticated WebSocket routes.
        "websocket": URLRouter([]),
    }
)
