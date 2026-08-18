from rest_framework.permissions import BasePermission


class IsPlatformAdmin(BasePermission):
    message = "Administrator access is required."

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(user and user.is_authenticated and user.is_admin and user.is_staff)
