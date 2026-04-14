from django.urls import include, path

urlpatterns = [
    path("schema/", include("schematic.urls")),
]
