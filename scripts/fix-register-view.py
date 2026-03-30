"""Update RegisterView for async + add ProvisioningStatusView."""

# 1. Update auth_views.py
path = "backend/hiringnow/apps/users/auth_views.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace RegisterView to return immediately with provisioning status
old_register = '''class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [RegisterRateThrottle]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        user = result["user"]
        tenant = result["tenant"]
        # Refresh user from DB so employee_profile reverse relation is available
        user.refresh_from_db()
        token_serializer = CustomTokenObtainPairSerializer()
        tokens = token_serializer.get_token(user)
        refresh = tokens
        access = refresh.access_token
        response = Response(
            {
                "access": str(access),
                "refresh": str(refresh),
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "tenant_id": str(tenant.id),
                    "tenant_slug": tenant.slug,
                },
            },
            status=status.HTTP_201_CREATED,
        )
        return _set_auth_cookies(response, str(access), str(refresh))'''

new_register = '''class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [RegisterRateThrottle]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        tenant = result["tenant"]
        # Async: tenant row created instantly, DB provisioning runs in background
        return Response(
            {
                "status": "provisioning",
                "tenant_id": str(tenant.id),
                "tenant_slug": tenant.slug,
            },
            status=status.HTTP_202_ACCEPTED,
        )


class ProvisioningStatusView(APIView):
    """Poll this endpoint to check tenant provisioning progress."""
    permission_classes = [AllowAny]
    throttle_classes = []  # No throttle on status checks

    def get(self, request, tenant_slug):
        from apps.tenants.models import Tenant
        tenant = Tenant.objects.using("default").filter(slug=tenant_slug).first()
        if not tenant:
            return Response({"error": "Tenant not found"}, status=status.HTTP_404_NOT_FOUND)
        provisioning = tenant.settings.get("provisioning", {})
        step = provisioning.get("step", "unknown")
        progress = provisioning.get("progress", 0)
        error = provisioning.get("error")

        data = {"step": step, "progress": progress, "error": error}

        # If completed, also return JWT tokens so the frontend can auto-login
        if step == "completed":
            from .models import User
            from config.tenant_context import set_current_tenant
            set_current_tenant(tenant)
            user = User.objects.filter(is_tenant_admin=True).first()
            if user:
                token_serializer = CustomTokenObtainPairSerializer()
                tokens = token_serializer.get_token(user)
                data["access"] = str(tokens.access_token)
                data["refresh"] = str(tokens)
                data["user"] = {
                    "id": str(user.id),
                    "email": user.email,
                    "tenant_id": str(tenant.id),
                    "tenant_slug": tenant.slug,
                }

        resp = Response(data)
        # Set auth cookies if tokens are present
        if "access" in data:
            resp = _set_auth_cookies(resp, data["access"], data.get("refresh"))
        return resp'''

content = content.replace(old_register, new_register)

# Add ProvisioningStatusView to imports at top
content = content.replace(
    "from .auth_serializers import (",
    "from .auth_serializers import ("
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("OK: auth_views.py updated with async RegisterView + ProvisioningStatusView")

# 2. Update auth_urls.py to add the status endpoint
path = "backend/hiringnow/apps/users/auth_urls.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "from .auth_views import (\n    RegisterView, LoginView, MeView, ChangePasswordView,\n    TenantTokenRefreshView, TenantTokenBlacklistView,\n)",
    "from .auth_views import (\n    RegisterView, LoginView, MeView, ChangePasswordView,\n    TenantTokenRefreshView, TenantTokenBlacklistView,\n    ProvisioningStatusView,\n)"
)

content = content.replace(
    '    path("register/", RegisterView.as_view(), name="register"),',
    '    path("register/", RegisterView.as_view(), name="register"),\n    path("register/status/<slug:tenant_slug>/", ProvisioningStatusView.as_view(), name="register-status"),'
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("OK: auth_urls.py updated with provisioning status endpoint")
