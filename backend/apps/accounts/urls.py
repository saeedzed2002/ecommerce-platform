from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import AdminLoginView, CurrentUserView, OTPRequestView, OTPVerifyView

urlpatterns = [
    path("otp/request/", OTPRequestView.as_view(), name="otp-request"),
    path("otp/verify/", OTPVerifyView.as_view(), name="otp-verify"),
    path("admin/login/", AdminLoginView.as_view(), name="admin-login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("me/", CurrentUserView.as_view(), name="current-user"),
]
