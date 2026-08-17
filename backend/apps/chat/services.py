from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied

from .models import Conversation, Message


def is_platform_admin(user) -> bool:
    return bool(user.is_authenticated and user.is_admin and user.is_staff)


@transaction.atomic
def get_or_create_customer_conversation(*, user) -> Conversation:
    if is_platform_admin(user):
        raise PermissionDenied("Administrators must select a customer conversation.")
    conversation, _ = Conversation.objects.select_for_update().get_or_create(
        customer=user
    )
    return conversation


def get_conversation_for_user(*, user, conversation_id) -> Conversation:
    queryset = Conversation.objects.select_related("customer")
    if not is_platform_admin(user):
        queryset = queryset.filter(customer=user)
    conversation = queryset.filter(pk=conversation_id).first()
    if conversation is None:
        raise NotFound("Conversation not found.")
    return conversation


@transaction.atomic
def create_message(
    *, user, conversation_id, body: str, client_message_id=None
) -> Message:
    queryset = Conversation.objects.select_for_update().select_related("customer")
    if not is_platform_admin(user):
        queryset = queryset.filter(customer=user)
    conversation = queryset.filter(pk=conversation_id).first()
    if conversation is None:
        raise NotFound("Conversation not found.")
    if client_message_id is not None:
        existing = Message.objects.filter(
            conversation=conversation, client_message_id=client_message_id
        ).first()
        if existing is not None:
            if existing.sender_id != user.id:
                raise PermissionDenied("Message identifier belongs to another user.")
            return existing
    message = Message.objects.create(
        conversation=conversation,
        sender=user,
        body=body,
        client_message_id=client_message_id,
    )
    conversation.last_message_at = message.created_at
    update_fields = ["last_message_at", "updated_at"]
    if conversation.status != Conversation.Status.OPEN:
        conversation.status = Conversation.Status.OPEN
        update_fields.append("status")
    conversation.save(update_fields=update_fields)
    return message


def message_payload(message: Message) -> dict:
    return {
        "id": message.id,
        "body": message.body,
        "sender_role": message.sender.role,
        "client_message_id": (
            str(message.client_message_id) if message.client_message_id else None
        ),
        "created_at": message.created_at.isoformat(),
        "read_at": message.read_at.isoformat() if message.read_at else None,
    }


def mark_messages_read(*, user, conversation: Conversation) -> None:
    Message.objects.filter(conversation=conversation, read_at__isnull=True).exclude(
        sender=user
    ).update(read_at=timezone.now())


def publish_message(message: Message) -> None:
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    async_to_sync(channel_layer.group_send)(
        f"chat.{message.conversation_id}",
        {"type": "chat.message", "message": message_payload(message)},
    )
