from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.db import transaction
from django.core.management import call_command
import threading

from apps.tenants.models import Tenant
from config.tenant_context import set_current_tenant
from config.db_utils import create_tenant_database
from .models import User



def _update_provisioning(tenant, step, progress, error=None):
    tenant.settings = {**tenant.settings, "provisioning": {"step": step, "progress": progress, "error": error}}
    tenant.save(using="default", update_fields=["settings"])


def _provision_tenant_background(tenant, validated_data, password):
    from django.conf import settings as django_settings
    db_name = tenant.db_name
    try:
        _update_provisioning(tenant, "creating_database", 10)
        try:
            create_tenant_database(db_name)
        except Exception as db_err:
            if "already exists" not in str(db_err):
                raise  # Re-raise if it is not a "already exists" error
        _update_provisioning(tenant, "configuring", 20)
        if db_name not in django_settings.DATABASES:
            default = django_settings.DATABASES["default"].copy()
            default["NAME"] = db_name
            django_settings.DATABASES[db_name] = default
        _update_provisioning(tenant, "running_migrations", 30)
        call_command("migrate", "--database", db_name, "--run-syncdb", verbosity=0)
        _update_provisioning(tenant, "creating_admin", 60)
        set_current_tenant(tenant)
        from django.db import transaction as db_tx
        with db_tx.atomic(using=db_name):
            user = User.objects.db_manager(db_name).create_user(
                email=validated_data["email"], password=password,
                first_name=validated_data.get("first_name", ""),
                last_name=validated_data.get("last_name", ""),
                is_tenant_admin=True,
            )
            _update_provisioning(tenant, "creating_profile", 70)
            from apps.employees.models import Employee
            Employee.objects.using(db_name).create(user=user,
                first_name=user.first_name or tenant.name,
                last_name=user.last_name, email=user.email,
                designation="Admin", status=Employee.Status.ACTIVE)
        try:
            call_command("seed_rbac", "--database", db_name, verbosity=0)
        except Exception:
            pass
        _update_provisioning(tenant, "assigning_roles", 90)
        try:
            from apps.rbac.models import Role, UserRole
            admin_role = Role.objects.filter(slug="admin").first()
            if admin_role:
                UserRole.objects.get_or_create(user=user, role=admin_role)
        except Exception:
            pass
        _update_provisioning(tenant, "completed", 100)
    except Exception as e:
        _update_provisioning(tenant, "failed", 0, error=str(e))
        try:
            from config.db_utils import drop_tenant_database
            drop_tenant_database(db_name)
        except Exception:
            pass
        tenant.status = Tenant.Status.INACTIVE
        tenant.save(using="default", update_fields=["status"])


# validate input and orchestrate tenant creation + first user
class RegisterSerializer(serializers.Serializer):
    tenant_name = serializers.CharField(max_length = 255)
    tenant_slug = serializers.SlugField(max_length = 100)
    email = serializers.EmailField()
    password = serializers.CharField(min_length = 8, write_only = True)
    first_name = serializers.CharField(max_length = 150, required = False, allow_blank = True)
    last_name = serializers.CharField(max_length = 150, required = False, allow_blank = True)

    # ensure tenant slug is unique in registry
    def validate_tenant_slug(self, value):
        if Tenant.objects.using('default').filter(slug = value).exists():
            raise serializers.ValidationError('A tenant with this slug already exists.')
        return value

    # create registry tenant instantly, provision DB in background thread
    def create(self, validated_data):
        from django.conf import settings as django_settings
        tenant_name = validated_data.pop("tenant_name")
        tenant_slug = validated_data.pop("tenant_slug")
        password = validated_data.pop("password")
        prefix = getattr(django_settings, "TENANT_DB_NAME_PREFIX", "recruitment_db_")
        db_name = (prefix + tenant_slug).replace("-", "_")
        with transaction.atomic(using="default"):
            tenant = Tenant.objects.using("default").create(
                name=tenant_name, slug=tenant_slug, db_name=db_name,
                settings={"provisioning": {"step": "queued", "progress": 0, "error": None}},
            )
        thread = threading.Thread(
            target=_provision_tenant_background,
            args=(tenant, {**validated_data}, password),
            daemon=True,
        )
        thread.start()
        return {"tenant": tenant}

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['username'] = serializers.CharField(required=False)
        self.fields['tenant_slug'] = serializers.SlugField(required=True)
        self.fields['email'] = serializers.EmailField(required=True)
        del self.fields['password']
        self.fields['password'] = serializers.CharField(write_only=True, required=True)

    # authenticate user for given tenant and build token payload
    def validate(self, attrs):
        tenant_slug = attrs.get('tenant_slug')
        email = attrs.get('email')
        password = attrs.get('password')
        tenant = Tenant.objects.using('default').filter(slug=tenant_slug).first()
        if not tenant:
            raise serializers.ValidationError({'tenant_slug': 'Tenant not found.'})
        if tenant.status != Tenant.Status.ACTIVE:
            raise serializers.ValidationError({'tenant_slug': 'This tenant account is not active.'})
        set_current_tenant(tenant)
        user = User.objects.filter(email=email).first()
        if not user or not user.check_password(password):
            raise serializers.ValidationError({'detail': 'Invalid credentials.'})
        if not user.is_active:
            raise serializers.ValidationError({'detail': 'User is inactive.'})
        refresh = self.get_token(user)
        data = {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': str(user.id),
                'email': user.email,
                'tenant_id': str(tenant.id),
                'tenant_slug': tenant.slug,
            },
        }
        return data

    # add tenant_id, tenant_slug, must_change_password, employee_id to JWT claims
    def get_token(self, user):
        from config.tenant_context import get_current_tenant
        token = super().get_token(user)
        tenant = get_current_tenant()
        if tenant:
            token['tenant_id'] = str(tenant.id)
            token['tenant_slug'] = tenant.slug
        token['must_change_password'] = getattr(user, 'must_change_password', False)
        # Eagerly resolve employee_id for the frontend
        employee_profile = getattr(user, 'employee_profile', None)
        if employee_profile:
            token['employee_id'] = str(employee_profile.id)
        return token

class UserMeSerializer(serializers.ModelSerializer):

    tenant_slug = serializers.SerializerMethodField()
    tenant_id = serializers.SerializerMethodField()
    employee_id = serializers.SerializerMethodField()

    onboarding_status = serializers.SerializerMethodField()
    role_slug = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name',
            'avatar', 'accent_color', 'bio',
            'must_change_password', 'last_login_at',
            'tenant_id', 'tenant_slug', 'is_tenant_admin',
            'employee_id', 'onboarding_status', 'role_slug',
        ]
        read_only_fields = fields

    def get_tenant_slug(self, obj):
        request = self.context.get('request')
        if request and getattr(request, 'tenant', None):
            return request.tenant.slug
        return None

    def get_tenant_id(self, obj):
        request = self.context.get('request')
        if request and getattr(request, 'tenant', None):
            return str(request.tenant.id)
        return None

    def get_employee_id(self, obj):
        employee_profile = getattr(obj, 'employee_profile', None)
        if employee_profile:
            return str(employee_profile.id)
        return None

    def get_onboarding_status(self, obj):
        employee_profile = getattr(obj, 'employee_profile', None)
        if employee_profile:
            return employee_profile.onboarding_status
        return None

    def get_role_slug(self, obj):
        """Return the user's primary RBAC role slug from UserRole."""
        try:
            from apps.rbac.models import UserRole
            user_role = UserRole.objects.filter(user=obj).select_related('role').first()
            if user_role:
                return user_role.role.slug
        except Exception:
            pass
        return 'employee'  # default fallback


class UpdateMeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'avatar', 'accent_color', 'bio']

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True, required=False)
    new_password = serializers.CharField(write_only=True, required=True, min_length=8)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Old password is incorrect.')
        return value

    def validate(self, attrs):
        user = self.context['request'].user
        # First-login flow: skip old_password if must_change_password is True
        if getattr(user, 'must_change_password', False):
            return attrs
        # Normal flow: old_password is required
        if not attrs.get('old_password'):
            raise serializers.ValidationError({'old_password': 'This field is required.'})
        if attrs.get('old_password') == attrs['new_password']:
            raise serializers.ValidationError({'new_password': 'New password must differ from old password.'})
        return attrs