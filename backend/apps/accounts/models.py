from typing import ClassVar

from django.contrib.auth.base_user import AbstractBaseUser
from django.contrib.auth.models import PermissionsMixin
from django.db import models

from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        CUSTOMER = "customer", "Customer"
        ADMIN = "admin", "Admin"

    phone = models.CharField(max_length=15, unique=True)
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.CUSTOMER)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    joined_at = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = "phone"
    REQUIRED_FIELDS: ClassVar[list[str]] = []

    class Meta:
        ordering = ("-joined_at",)

    def __str__(self) -> str:
        return self.phone

    @property
    def is_admin(self) -> bool:
        return self.role == self.Role.ADMIN
