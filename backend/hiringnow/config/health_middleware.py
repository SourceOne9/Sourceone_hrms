from django.http import JsonResponse


class HealthcheckBypassMiddleware:
    """
    Return a lightweight 200 for Railway health probes before stricter
    host/security middleware can reject the request.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith("/health/"):
            return JsonResponse({"status": "ok"})
        return self.get_response(request)
