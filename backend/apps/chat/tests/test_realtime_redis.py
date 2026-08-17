import asyncio

import pytest
from asgiref.sync import async_to_sync
from channels.testing import WebsocketCommunicator
from rest_framework_simplejwt.tokens import AccessToken

from apps.accounts.models import User
from apps.chat.models import Conversation, Message
from config.asgi import application


@pytest.mark.django_db(transaction=True)
def test_customer_and_admin_receive_messages_through_redis_channel_layer() -> None:
    customer = User.objects.create_user(phone="989121234511")
    admin = User.objects.create_user(
        phone="989121234512",
        role=User.Role.ADMIN,
        is_staff=True,
    )
    conversation = Conversation.objects.create(customer=customer)

    async def run_scenario() -> None:
        customer_socket = WebsocketCommunicator(
            application,
            f"/ws/chat/{conversation.id}/",
            subprotocols=["access_token", str(AccessToken.for_user(customer))],
        )
        admin_socket = WebsocketCommunicator(
            application,
            f"/ws/chat/{conversation.id}/",
            subprotocols=["access_token", str(AccessToken.for_user(admin))],
        )
        try:
            customer_connected, _ = await customer_socket.connect()
            admin_connected, _ = await admin_socket.connect()
            assert customer_connected is True
            assert admin_connected is True

            # Redis client 8 previously disconnected this blocking receive after
            # five seconds. Keep both sockets idle beyond that boundary first.
            await asyncio.sleep(6)
            await customer_socket.send_json_to({"body": "Redis delivery check"})

            customer_payload = await customer_socket.receive_json_from()
            admin_payload = await admin_socket.receive_json_from()
            assert customer_payload["type"] == "message"
            assert admin_payload["type"] == "message"
            assert customer_payload["message"] == admin_payload["message"]
            assert customer_payload["message"]["body"] == "Redis delivery check"
        finally:
            await customer_socket.disconnect()
            await admin_socket.disconnect()

    async_to_sync(run_scenario)()
    assert Message.objects.filter(conversation=conversation).count() == 1
