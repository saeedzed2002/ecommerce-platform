import uuid

from django.conf import settings
from django.db import models

from apps.catalog.models import TimeStampedModel


class Conversation(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="support_conversation",
    )
    last_message_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-last_message_at", "-created_at")

    def __str__(self) -> str:
        return f"Support conversation for {self.customer.phone}"


class Message(TimeStampedModel):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="chat_messages",
    )
    body = models.TextField(max_length=2000)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("created_at", "id")
        indexes = [
            models.Index(
                fields=("conversation", "created_at"),
                name="chat_messag_convers_3154fc_idx",
            )
        ]

    def __str__(self) -> str:
        return f"Message {self.pk} in {self.conversation_id}"
