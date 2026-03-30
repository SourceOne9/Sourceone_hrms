"""Audit log middleware — captures request metadata for audit trail."""
import logging

logger = logging.getLogger(__name__)


class AuditLogMiddleware:
    """Middleware that logs request metadata for audit purposes."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        # Log non-GET state-changing requests for audit trail
        if request.method not in ("GET", "HEAD", "OPTIONS"):
            user_id = getattr(request.user, "id", None) if hasattr(request, "user") else None
            logger.info(
                "audit_request",
                extra={
                    "method": request.method,
                    "path": request.path,
                    "status": response.status_code,
                    "user_id": str(user_id) if user_id else None,
                    "ip": request.META.get("REMOTE_ADDR"),
                },
            )
        return response
