from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.translation import gettext_lazy as _

from .models import OTPChallenge, User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User
    ordering = ("-joined_at",)
    list_display = ("phone", "role", "is_staff", "is_active", "joined_at")
    list_filter = ("role", "is_staff", "is_active")
    search_fields = ("phone",)
    fieldsets = (
        (None, {"fields": ("phone", "password")}),
        (_("Role"), {"fields": ("role",)}),
        (
            _("Permissions"),
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        (_("Important dates"), {"fields": ("last_login", "joined_at")}),
    )
    readonly_fields = ("joined_at",)
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "phone",
                    "role",
                    "password1",
                    "password2",
                    "is_staff",
                    "is_superuser",
                ),
            },
        ),
    )


@admin.register(OTPChallenge)
class OTPChallengeAdmin(admin.ModelAdmin):
    list_display = ("phone", "created_at", "expires_at", "attempts", "verified_at")
    list_filter = ("verified_at", "invalidated_at")
    readonly_fields = (
        "phone",
        "code_hash",
        "expires_at",
        "attempts",
        "created_at",
        "verified_at",
        "invalidated_at",
        "provider_message_id",
    )
    search_fields = ("phone",)

    def has_add_permission(self, request):
        return False
