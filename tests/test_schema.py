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
def test_suppress_through_m2m_suppresses_logical_edge(settings):
    settings.SCHEMATIC = {"suppress_through_m2m": True}
    schema = build_schema(filter_apps=["testapp"])
    m2m_edges = {(e.source, e.target) for e in schema.edges if e.relation_type == "m2m"}
    assert ("testapp.BookWithThrough", "testapp.Tag") not in m2m_edges


@pytest.mark.django_db
def test_suppress_through_m2m_keeps_implicit_m2m(settings):
    settings.SCHEMATIC = {"suppress_through_m2m": True}
    schema = build_schema(filter_apps=["testapp"])
    m2m_edges = {(e.source, e.target) for e in schema.edges if e.relation_type == "m2m"}
    assert ("testapp.Book", "testapp.Tag") in m2m_edges


@pytest.mark.django_db
def test_through_table_node_tagged():
    schema = build_schema(filter_apps=["testapp"])
    through_node = next(n for n in schema.nodes if n.name == "BookTagLink")
    assert "through" in through_node.tags


@pytest.mark.django_db
def test_non_through_table_not_tagged():
    schema = build_schema(filter_apps=["testapp"])
    book_node = next(n for n in schema.nodes if n.name == "Book")
    assert "through" not in book_node.tags


@pytest.mark.django_db
def test_suppress_through_m2m_default_keeps_all_edges():
    schema = build_schema(filter_apps=["testapp"])
    m2m_edges = {(e.source, e.target) for e in schema.edges if e.relation_type == "m2m"}
    assert ("testapp.BookWithThrough", "testapp.Tag") in m2m_edges


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
