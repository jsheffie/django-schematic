"""Visibility matrix tests for SchemaView and SchemaAPIView."""
import pytest
from django.http import Http404
from django.test import RequestFactory, override_settings

from schematic.views import SchemaAPIView, SchemaView


@pytest.fixture()
def rf():
    return RequestFactory()


# ---------------------------------------------------------------------------
# Default visible (DEBUG-gated)
# ---------------------------------------------------------------------------


@override_settings(DEBUG=True)
@pytest.mark.django_db
def test_schema_view_visible_when_debug_true(rf):
    response = SchemaView.as_view()(rf.get("/"))
    assert response.status_code == 200


@override_settings(DEBUG=False)
def test_schema_view_hidden_when_debug_false(rf):
    with pytest.raises(Http404):
        SchemaView.as_view()(rf.get("/"))


@override_settings(DEBUG=True)
@pytest.mark.django_db
def test_api_view_visible_when_debug_true(rf):
    response = SchemaAPIView.as_view()(rf.get("/"))
    assert response.status_code == 200


@override_settings(DEBUG=False)
def test_api_view_hidden_when_debug_false(rf):
    with pytest.raises(Http404):
        SchemaAPIView.as_view()(rf.get("/"))


# ---------------------------------------------------------------------------
# Explicit visible=False overrides DEBUG
# ---------------------------------------------------------------------------


@override_settings(DEBUG=True, SCHEMATIC={"visible": False})
def test_schema_view_hidden_when_visible_false(rf):
    with pytest.raises(Http404):
        SchemaView.as_view()(rf.get("/"))


@override_settings(DEBUG=False, SCHEMATIC={"visible": True})
@pytest.mark.django_db
def test_schema_view_visible_when_visible_true(rf):
    response = SchemaView.as_view()(rf.get("/"))
    assert response.status_code == 200


@override_settings(DEBUG=True, SCHEMATIC={"visible": False})
def test_api_view_hidden_when_visible_false(rf):
    with pytest.raises(Http404):
        SchemaAPIView.as_view()(rf.get("/"))


@override_settings(DEBUG=False, SCHEMATIC={"visible": True})
@pytest.mark.django_db
def test_api_view_visible_when_visible_true(rf):
    response = SchemaAPIView.as_view()(rf.get("/"))
    assert response.status_code == 200


# ---------------------------------------------------------------------------
# Callable visible
# ---------------------------------------------------------------------------


@override_settings(DEBUG=True, SCHEMATIC={"visible": lambda r: True})
@pytest.mark.django_db
def test_schema_view_callable_true(rf):
    response = SchemaView.as_view()(rf.get("/"))
    assert response.status_code == 200


@override_settings(DEBUG=True, SCHEMATIC={"visible": lambda r: False})
def test_schema_view_callable_false(rf):
    with pytest.raises(Http404):
        SchemaView.as_view()(rf.get("/"))


@override_settings(DEBUG=True, SCHEMATIC={"visible": lambda r: True})
@pytest.mark.django_db
def test_api_view_callable_true(rf):
    response = SchemaAPIView.as_view()(rf.get("/"))
    assert response.status_code == 200


@override_settings(DEBUG=True, SCHEMATIC={"visible": lambda r: False})
def test_api_view_callable_false(rf):
    with pytest.raises(Http404):
        SchemaAPIView.as_view()(rf.get("/"))
