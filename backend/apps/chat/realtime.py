from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken


def _token_from_subprotocol(scope) -> str | None:
    protocols = list(scope.get("subprotocols", []))
    if not protocols:
        headers = dict(scope.get("headers", []))
        raw_protocols = headers.get(b"sec-websocket-protocol", b"").decode(
            "ascii", "ignore"
        )
        protocols = [protocol.strip() for protocol in raw_protocols.split(",")]
    if len(protocols) >= 2 and protocols[0] == "access_token":
        return protocols[1]
    return None


@database_sync_to_async
def _get_user(token: str):
    try:
        authentication = JWTAuthentication()
        validated_token = authentication.get_validated_token(token)
        return authentication.get_user(validated_token)
    except (AuthenticationFailed, InvalidToken):
        return AnonymousUser()


class JwtAuthMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        scope = dict(scope)
        token = _token_from_subprotocol(scope)
        scope["user"] = await _get_user(token) if token else AnonymousUser()
        return await self.app(scope, receive, send)
