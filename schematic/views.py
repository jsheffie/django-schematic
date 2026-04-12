from __future__ import annotations

from django.http import HttpRequest, HttpResponse, JsonResponse
from django.views import View
from django.shortcuts import render

from .schema import build_schema
from .settings import get_setting


class SchemaView(View):
    """Serves the React SPA shell."""

    def get(self, request: HttpRequest) -> HttpResponse:
        if not self._is_visible(request):
            return HttpResponse(status=403)
        return render(request, "schematic/index.html")

    def _is_visible(self, request: HttpRequest) -> bool:
        visible = get_setting("visible")
        if callable(visible):
            return visible(request)
        return bool(visible)


class SchemaAPIView(View):
    """Returns the schema graph as JSON.

    Query params:
        apps  — comma-separated list of app labels to include
    """

    def get(self, request: HttpRequest) -> JsonResponse:
        if not self._is_visible(request):
            return JsonResponse({"error": "forbidden"}, status=403)

        filter_apps: list[str] | None = None
        if apps_param := request.GET.get("apps"):
            filter_apps = [a.strip() for a in apps_param.split(",") if a.strip()]

        schema = build_schema(filter_apps=filter_apps)
        return JsonResponse(schema.to_dict())

    def _is_visible(self, request: HttpRequest) -> bool:
        visible = get_setting("visible")
        if callable(visible):
            return visible(request)
        return bool(visible)
