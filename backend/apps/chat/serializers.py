from rest_framework import serializers

from apps.accounts.models import User

from .models import Conversation, Message


class ConversationSerializer(serializers.ModelSerializer):
    customer_phone = serializers.CharField(source="customer.phone", read_only=True)
    assigned_admin_phone = serializers.CharField(
        source="assigned_admin.phone", read_only=True, default=None
    )
    unread_count = serializers.SerializerMethodField()

    def get_unread_count(self, conversation: Conversation) -> int:
        request = self.context.get("request")
        user = request.user if request else None
        queryset = Message.objects.filter(
            conversation=conversation, read_at__isnull=True
        )
        if user is not None and user.is_admin and user.is_staff:
            return queryset.filter(sender__role=User.Role.CUSTOMER).count()
        return queryset.exclude(sender=conversation.customer).count()

    class Meta:
        model = Conversation
        fields = (
            "id",
            "customer_phone",
            "last_message_at",
            "status",
            "assigned_admin",
            "assigned_admin_phone",
            "unread_count",
            "created_at",
        )


class MessageSerializer(serializers.ModelSerializer):
    sender_role = serializers.CharField(source="sender.role", read_only=True)

    class Meta:
        model = Message
        fields = (
            "id",
            "body",
            "sender_role",
            "client_message_id",
            "created_at",
            "read_at",
        )


class CreateMessageSerializer(serializers.Serializer):
    body = serializers.CharField(max_length=2000, trim_whitespace=True)
    client_message_id = serializers.UUIDField(required=False)

    def validate_body(self, value: str) -> str:
        if not value:
            raise serializers.ValidationError("Message body cannot be empty.")
        return value


class ConversationUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=Conversation.Status.choices, required=False
    )
    assigned_admin = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role=User.Role.ADMIN, is_staff=True),
        required=False,
        allow_null=True,
    )

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("Provide a status or an assigned admin.")
        return attrs
