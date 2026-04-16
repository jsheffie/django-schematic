"""Tests for schema extraction."""
import pytest

from schematic.schema import build_schema


@pytest.mark.django_db
def test_build_schema_returns_nodes():
    schema = build_schema(filter_apps=["testapp"])
    node_ids = {n.id for n in schema.nodes}
    assert "testapp.Author" in node_ids
    assert "testapp.Book" in node_ids
    assert "testapp.Tag" in node_ids


@pytest.mark.django_db
def test_build_schema_fk_edge():
    schema = build_schema(filter_apps=["testapp"])
    fk_edges = [e for e in schema.edges if e.relation_type == "fk"]
    sources_targets = {(e.source, e.target) for e in fk_edges}
    assert ("testapp.Book", "testapp.Author") in sources_targets


@pytest.mark.django_db
def test_build_schema_m2m_edge():
    schema = build_schema(filter_apps=["testapp"])
    m2m_edges = [e for e in schema.edges if e.relation_type == "m2m"]
    sources_targets = {(e.source, e.target) for e in m2m_edges}
    assert ("testapp.Book", "testapp.Tag") in sources_targets


@pytest.mark.django_db
def test_node_has_app_name():
    schema = build_schema(filter_apps=["testapp"])
    author = next(n for n in schema.nodes if n.name == "Author")
    # app_label is the short label; app_name is the full dotted module path
    assert author.app_label == "testapp"
    assert "testapp" in author.app_name


@pytest.mark.django_db
def test_schema_has_app_names_mapping():
    schema = build_schema(filter_apps=["testapp"])
    assert "testapp" in schema.app_names
    assert "testapp" in schema.app_names["testapp"]


@pytest.mark.django_db
def test_to_json_is_valid():
    import json

    schema = build_schema(filter_apps=["testapp"])
    data = json.loads(schema.to_json())
    assert "nodes" in data
    assert "edges" in data
    assert "app_labels" in data
    assert "app_names" in data
    assert isinstance(data["app_names"], dict)
