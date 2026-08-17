from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.translation import gettext_lazy as _

from .models import User


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
