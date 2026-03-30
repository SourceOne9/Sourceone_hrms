from django.urls import path

from .auth_views import (
    RegisterView, LoginView, MeView, ChangePasswordView,
    TenantTokenRefreshView, TenantTokenBlacklistView,
    ProvisioningStatusView,
)

app_name = "auth"

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("register/status/<slug:tenant_slug>/", ProvisioningStatusView.as_view(), name="register-status"),
    path("login/", LoginView.as_view(), name="login"),
    path("refresh/", TenantTokenRefreshView.as_view(), name="token_refresh"),
    path("logout/", TenantTokenBlacklistView.as_view(), name="token_blacklist"),
    path("me/", MeView.as_view(), name="me"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
]
