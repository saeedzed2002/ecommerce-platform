from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User
from .phone import normalize_iranian_mobile


class OTPRequestSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=32)

    def validate_phone(self, value: str) -> str:
        try:
            return normalize_iranian_mobile(value)
        except DjangoValidationError as error:
            raise serializers.ValidationError(
                "Enter a valid Iranian mobile number."
            ) from error


class OTPVerifySerializer(OTPRequestSerializer):
    code = serializers.RegexField(r"^\d{6}$")


class UserSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    phone = serializers.CharField(read_only=True)
    display_name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    birth_date = serializers.DateField(read_only=True)
    province = serializers.CharField(read_only=True)
    city = serializers.CharField(read_only=True)
    home_address = serializers.CharField(read_only=True)
    postal_code = serializers.CharField(read_only=True)
    role = serializers.CharField(read_only=True)
    joined_at = serializers.DateTimeField(read_only=True)


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "display_name",
            "email",
            "birth_date",
            "province",
            "city",
            "home_address",
            "postal_code",
        )

    def validate_display_name(self, value: str) -> str:
        return value.strip()

    def validate_email(self, value: str) -> str:
        return value.strip().lower()

    def validate_postal_code(self, value: str) -> str:
        value = value.strip()
        if value and (not value.isdigit() or len(value) != 10):
            raise serializers.ValidationError("Enter a 10-digit postal code.")
        return value


class AdminTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        if not self.user.is_admin or not self.user.is_staff:
            raise AuthenticationFailed("Administrator credentials are required.")
        data["user"] = UserSerializer(self.user).data
        return data
