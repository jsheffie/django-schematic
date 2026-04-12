from django.urls import path

from . import views

app_name = "schematic"

urlpatterns = [
    path("", views.SchemaView.as_view(), name="schema-ui"),
    path("api/", views.SchemaAPIView.as_view(), name="schema-api"),
]
