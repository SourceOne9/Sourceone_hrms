"""Script to update auth_serializers.py with async provisioning."""

path = "backend/hiringnow/apps/users/auth_serializers.py"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add threading import
if "import threading" not in content:
    content = content.replace(
        "from django.core.management import call_command",
        "from django.core.management import call_command\nimport threading"
    )

# 2. Add helper functions
helper = """

def _update_provisioning(tenant, step, progress, error=None):
    tenant.settings = {**tenant.settings, "provisioning": {"step": step, "progress": progress, "error": error}}
    tenant.save(using="default", update_fields=["settings"])


def _provision_tenant_background(tenant, validated_data, password):
    from django.conf import settings as django_settings
    db_name = tenant.db_name
    try:
        _update_provisioning(tenant, "creating_database", 10)
        create_tenant_database(db_name)
        _update_provisioning(tenant, "configuring", 20)
        if db_name not in django_settings.DATABASES:
            default = django_settings.DATABASES["default"].copy()
            default["NAME"] = db_name
            django_settings.DATABASES[db_name] = default
        _update_provisioning(tenant, "running_migrations", 30)
        call_command("migrate", "--database", db_name, "--run-syncdb", verbosity=0)
        _update_provisioning(tenant, "creating_admin", 60)
        set_current_tenant(tenant)
        user = User.objects.db_manager(db_name).create_user(
            email=validated_data["email"], password=password,
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            is_tenant_admin=True,
        )
        _update_provisioning(tenant, "creating_profile", 70)
        from apps.employees.models import Employee
        Employee.objects.create(user=user, first_name=user.first_name or tenant.name,
            last_name=user.last_name, email=user.email, designation="Admin",
            status=Employee.Status.ACTIVE)
        _update_provisioning(tenant, "seeding_rbac", 80)
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

"""

if "_update_provisioning" not in content:
    content = content.replace("\n# validate input", helper + "\n# validate input")

# 3. Replace create method
old_marker = "    # create registry tenant, tenant DB, migrate it, and create admin user"
if old_marker in content:
    start = content.index(old_marker)
    return_marker = "        return {'tenant': tenant, 'user': user}"
    end = content.index(return_marker) + len(return_marker)
    new_create = '''    # create registry tenant instantly, provision DB in background thread
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
        return {"tenant": tenant}'''
    content = content[:start] + new_create + content[end:]
    print("OK: Replaced create() with async version")
else:
    print("WARN: Could not find create() marker")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("DONE: auth_serializers.py updated")
