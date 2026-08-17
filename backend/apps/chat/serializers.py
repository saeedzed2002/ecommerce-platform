from rest_framework import serializers

from .models import Conversation, Message


class ConversationSerializer(serializers.ModelSerializer):
    customer_phone = serializers.CharField(source="customer.phone", read_only=True)

    class Meta:
        model = Conversation
        fields = ("id", "customer_phone", "last_message_at", "created_at")


class MessageSerializer(serializers.ModelSerializer):
    sender_role = serializers.CharField(source="sender.role", read_only=True)

    class Meta:
        model = Message
        fields = ("id", "body", "sender_role", "created_at", "read_at")


class CreateMessageSerializer(serializers.Serializer):
    body = serializers.CharField(max_length=2000, trim_whitespace=True)

    def validate_body(self, value: str) -> str:
        if not value:
            raise serializers.ValidationError("Message body cannot be empty.")
        return value
