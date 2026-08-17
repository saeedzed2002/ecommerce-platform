from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Conversation, Message
from .permissions import IsPlatformAdmin
from .serializers import (
    ConversationSerializer,
    CreateMessageSerializer,
    MessageSerializer,
)
from .services import (
    create_message,
    get_conversation_for_user,
    get_or_create_customer_conversation,
    mark_messages_read,
    publish_message,
)


class CustomerConversationAPIView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        conversation = get_or_create_customer_conversation(user=request.user)
        return Response(ConversationSerializer(conversation).data)


class AdminConversationListAPIView(ListAPIView):
    permission_classes = (IsPlatformAdmin,)
    serializer_class = ConversationSerializer

    def get_queryset(self):
        return Conversation.objects.select_related("customer")


class MessageListCreateAPIView(APIView):
    permission_classes = (IsAuthenticated,)

    def get_conversation(self):
        return get_conversation_for_user(
            user=self.request.user,
            conversation_id=self.kwargs["conversation_id"],
        )

    def get(self, request, conversation_id):
        conversation = self.get_conversation()
        mark_messages_read(user=request.user, conversation=conversation)
        queryset = Message.objects.filter(conversation=conversation).select_related(
            "sender"
        )
        paginator = PageNumberPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        serializer = MessageSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request, conversation_id):
        conversation = self.get_conversation()
        serializer = CreateMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = create_message(
            user=request.user,
            conversation_id=conversation.id,
            body=serializer.validated_data["body"],
        )
        publish_message(message)
        return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)
