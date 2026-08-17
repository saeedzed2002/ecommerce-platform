from .test import *

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [
                {
                    "address": env("REDIS_URL", default="redis://127.0.0.1:6379/15"),
                    "socket_timeout": None,
                    "socket_connect_timeout": 5,
                }
            ]
        },
    }
}
