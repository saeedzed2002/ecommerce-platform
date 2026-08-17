from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from rest_framework.exceptions import APIException

from .serializers import CreateMessageSerializer
from .services import create_message, get_conversation_for_user, message_payload


class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope["user"]
        if not user.is_authenticated:
            await self.close(code=4401)
            return
        self.conversation_id = self.scope["url_route"]["kwargs"]["conversation_id"]
        if not await self._can_access_conversation(user, self.conversation_id):
            await self.close(code=4404)
            return
        self.group_name = f"chat.{self.conversation_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept(subprotocol="access_token")

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        payload = {"body": content.get("body")}
        if content.get("client_message_id") is not None:
            payload["client_message_id"] = content["client_message_id"]
        serializer = CreateMessageSerializer(data=payload)
        if not serializer.is_valid():
            await self.send_json({"type": "error", "detail": serializer.errors})
            return
        try:
            message, created = await self._create_message(
                self.scope["user"],
                self.conversation_id,
                serializer.validated_data["body"],
                serializer.validated_data.get("client_message_id"),
            )
        except APIException as error:
            await self.send_json(
                {
                    "type": "error",
                    "detail": error.detail,
                    "client_message_id": content.get("client_message_id"),
                }
            )
            return
        if created:
            await self.channel_layer.group_send(
                self.group_name,
                {"type": "chat.message", "message": message},
            )
        else:
            await self.send_json({"type": "message", "message": message})

    async def chat_message(self, event):
        await self.send_json({"type": "message", "message": event["message"]})

    @database_sync_to_async
    def _can_access_conversation(self, user, conversation_id) -> bool:
        try:
            get_conversation_for_user(user=user, conversation_id=conversation_id)
        except APIException:
            return False
        return True

    @database_sync_to_async
    def _create_message(
        self, user, conversation_id, body: str, client_message_id
    ) -> tuple[dict, bool]:
        message, created = create_message(
            user=user,
            conversation_id=conversation_id,
            body=body,
            client_message_id=client_message_id,
        )
        return message_payload(message), created
