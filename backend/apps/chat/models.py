import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q

from apps.catalog.models import TimeStampedModel


class Conversation(TimeStampedModel):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        RESOLVED = "resolved", "Resolved"
        CLOSED = "closed", "Closed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="support_conversation",
    )
    last_message_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.OPEN
    )
    assigned_admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_support_conversations",
    )

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
    client_message_id = models.UUIDField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("created_at", "id")
        indexes = [
            models.Index(
                fields=("conversation", "created_at"),
                name="chat_messag_convers_3154fc_idx",
            )
        ]
        constraints = [
            models.UniqueConstraint(
                fields=("conversation", "client_message_id"),
                condition=Q(client_message_id__isnull=False),
                name="chat_message_unique_client_id",
            )
        ]

    def __str__(self) -> str:
        return f"Message {self.pk} in {self.conversation_id}"
