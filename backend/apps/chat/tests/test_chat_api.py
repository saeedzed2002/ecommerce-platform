import pytest
from asgiref.sync import async_to_sync
from channels.testing import WebsocketCommunicator
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from apps.accounts.models import User
from apps.chat.models import Conversation, Message
from config.asgi import application
from config.settings import base as base_settings


@pytest.fixture
def customer() -> User:
    return User.objects.create_user(phone="989121234501")


@pytest.fixture
def second_customer() -> User:
    return User.objects.create_user(phone="989121234502")


@pytest.fixture
def admin() -> User:
    return User.objects.create_user(
        phone="989121234500",
        role=User.Role.ADMIN,
        is_staff=True,
    )


def test_production_channel_layer_disables_blocking_read_socket_timeout() -> None:
    host = base_settings.CHANNEL_LAYERS["default"]["CONFIG"]["hosts"][0]

    assert host["socket_timeout"] is None
    assert host["socket_connect_timeout"] == 5


@pytest.fixture
def customer_client(customer: User) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=customer)
    return client


@pytest.fixture
def admin_client(admin: User) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=admin)
    return client


@pytest.mark.django_db
def test_customer_gets_one_persistent_support_conversation(
    customer_client: APIClient, customer: User
) -> None:
    first = customer_client.get("/api/v1/chat/conversation/")
    second = customer_client.get("/api/v1/chat/conversation/")

    assert first.status_code == 200
    assert first.data["id"] == second.data["id"]
    assert str(Conversation.objects.get(customer=customer).pk) == first.data["id"]


@pytest.mark.django_db
def test_customer_cannot_access_another_customers_conversation(
    customer_client: APIClient, second_customer: User
) -> None:
    conversation = Conversation.objects.create(customer=second_customer)

    response = customer_client.get(
        f"/api/v1/chat/conversations/{conversation.id}/messages/"
    )

    assert response.status_code == 404


@pytest.mark.django_db
def test_admin_can_list_conversations_and_reply(
    admin_client: APIClient, customer: User, admin: User
) -> None:
    conversation = Conversation.objects.create(customer=customer)

    listed = admin_client.get("/api/v1/chat/conversations/")
    created = admin_client.post(
        f"/api/v1/chat/conversations/{conversation.id}/messages/",
        {"body": "Support reply"},
    )

    assert listed.status_code == 200
    assert listed.data["results"][0]["customer_phone"] == customer.phone
    assert created.status_code == 201
    assert created.data["sender_role"] == User.Role.ADMIN
    assert (
        Message.objects.get(conversation=conversation, sender=admin).body
        == "Support reply"
    )


@pytest.mark.django_db
def test_reading_messages_marks_other_partys_messages_as_read(
    customer_client: APIClient, customer: User, admin: User
) -> None:
    conversation = Conversation.objects.create(customer=customer)
    message = Message.objects.create(
        conversation=conversation,
        sender=admin,
        body="Support reply",
    )

    response = customer_client.get(
        f"/api/v1/chat/conversations/{conversation.id}/messages/"
    )

    assert response.status_code == 200
    assert response.data["results"][0]["body"] == "Support reply"
    message.refresh_from_db()
    assert message.read_at is not None


@pytest.mark.django_db(transaction=True)
def test_customer_can_send_a_message_over_an_authenticated_websocket(
    customer: User,
) -> None:
    conversation = Conversation.objects.create(customer=customer)
    token = str(AccessToken.for_user(customer))

    async def run_scenario() -> None:
        communicator = WebsocketCommunicator(
            application,
            f"/ws/chat/{conversation.id}/",
            subprotocols=["access_token", token],
        )
        connected, selected_protocol = await communicator.connect()
        assert connected is True
        assert selected_protocol == "access_token"
        await communicator.send_json_to({"body": "Customer message"})
        payload = await communicator.receive_json_from()
        assert payload["type"] == "message"
        assert payload["message"]["body"] == "Customer message"
        assert payload["message"]["sender_role"] == User.Role.CUSTOMER
        await communicator.disconnect()

    async_to_sync(run_scenario)()
    assert Message.objects.get(conversation=conversation).body == "Customer message"
