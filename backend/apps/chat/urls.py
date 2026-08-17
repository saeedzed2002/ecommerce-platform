from django.urls import path

from .views import (
    AdminConversationListAPIView,
    AdminConversationManageAPIView,
    AdminConversationSummaryAPIView,
    CustomerConversationAPIView,
    MessageListCreateAPIView,
)

app_name = "chat"

urlpatterns = [
    path("conversation/", CustomerConversationAPIView.as_view(), name="conversation"),
    path(
        "conversations/",
        AdminConversationListAPIView.as_view(),
        name="conversation-list",
    ),
    path(
        "conversations/summary/",
        AdminConversationSummaryAPIView.as_view(),
        name="conversation-summary",
    ),
    path(
        "conversations/<uuid:conversation_id>/",
        AdminConversationManageAPIView.as_view(),
        name="conversation-manage",
    ),
    path(
        "conversations/<uuid:conversation_id>/messages/",
        MessageListCreateAPIView.as_view(),
        name="message-list",
    ),
]
