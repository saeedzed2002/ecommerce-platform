from django.conf import settings
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    AdminTokenObtainPairSerializer,
    OTPRequestSerializer,
    OTPVerifySerializer,
    UserProfileSerializer,
    UserSerializer,
)
from .services import OTPInvalid, OTPRateLimited, request_otp, verify_otp
from .sms import SMSProviderError


class OTPUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "SMS delivery is temporarily unavailable."


class AdminLoginView(TokenObtainPairView):
    serializer_class = AdminTokenObtainPairSerializer


class OTPRequestView(APIView):
    permission_classes = (AllowAny,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "otp"

    def post(self, request):
        serializer = OTPRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            request_otp(phone=serializer.validated_data["phone"])
        except OTPRateLimited:
            return Response(
                {"detail": "Please wait before requesting another code."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        except SMSProviderError as error:
            raise OTPUnavailable from error
        return Response(
            {
                "detail": "Verification code sent.",
                "expires_in": settings.OTP_CODE_TTL_SECONDS,
            },
            status=status.HTTP_202_ACCEPTED,
        )


class OTPVerifyView(APIView):
    permission_classes = (AllowAny,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "otp"

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = verify_otp(**serializer.validated_data)
        except OTPInvalid:
            return Response(
                {"detail": "The verification code is invalid or expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            }
        )


class CurrentUserView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserProfileSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)
