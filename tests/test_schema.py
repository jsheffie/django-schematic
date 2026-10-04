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


def _edge(schema, source: str, field_name: str, relation_type: str):
    return next(
        e
        for e in schema.edges
        if e.source == source and e.field_name == field_name and e.relation_type == relation_type
    )


@pytest.mark.django_db
def test_fk_edge_target_field_is_remote_pk():
    schema = build_schema(filter_apps=["testapp"])
    assert _edge(schema, "testapp.Book", "author", "fk").target_field == "id"


@pytest.mark.django_db
def test_m2m_edge_target_field_is_remote_pk():
    schema = build_schema(filter_apps=["testapp"])
    assert _edge(schema, "testapp.Book", "tags", "m2m").target_field == "id"


@pytest.mark.django_db
def test_custom_through_m2m_edge_target_field_is_remote_pk():
    # Django's RelatedField.target_field raises FieldDoesNotExist for M2M with a
    # custom `through`; the extractor must use related_model._meta.pk instead.
    schema = build_schema(filter_apps=["testapp"])
    assert _edge(schema, "testapp.BookWithThrough", "tags", "m2m").target_field == "id"


@pytest.mark.django_db
def test_subclass_edge_target_field_is_none():
    schema = build_schema(filter_apps=["testapp"])
    assert _edge(schema, "testapp.SpecialBook", "", "subclass").target_field is None


@pytest.mark.django_db
def test_target_field_serialized_in_json():
    import json

    schema = build_schema(filter_apps=["testapp"])
    edges = json.loads(schema.to_json())["edges"]
    assert all("target_field" in e for e in edges)


def _fields_by_name(schema, model_name: str):
    node = next(n for n in schema.nodes if n.name == model_name)
    return {f.name: f for f in node.fields}


@pytest.mark.django_db
def test_book_has_exactly_one_primary_key_field_named_id():
    fields = _fields_by_name(build_schema(filter_apps=["testapp"]), "Book")
    assert [f.name for f in fields.values() if f.primary_key] == ["id"]
    assert fields["author"].primary_key is False
    assert fields["title"].primary_key is False


@pytest.mark.django_db
def test_primary_key_flag_follows_pk_not_named_id():
    fields = _fields_by_name(build_schema(filter_apps=["testapp"]), "Isbn")
    assert [f.name for f in fields.values() if f.primary_key] == ["code"]


@pytest.mark.django_db
def test_internal_type_matches_django_internal_type():
    fields = _fields_by_name(build_schema(filter_apps=["testapp"]), "Book")
    assert fields["title"].internal_type == "CharField"
    assert fields["author"].internal_type == "ForeignKey"
    assert fields["id"].internal_type == "BigAutoField"


@pytest.mark.django_db
def test_internal_type_sees_through_custom_field_subclass():
    fields = _fields_by_name(build_schema(filter_apps=["testapp"]), "Isbn")
    assert fields["registered_at"].field_type == "CreatedTimestampField"
    assert fields["registered_at"].internal_type == "DateTimeField"


@pytest.mark.django_db
def test_primary_key_and_internal_type_serialized_in_json():
    import json

    nodes = json.loads(build_schema(filter_apps=["testapp"]).to_json())["nodes"]
    for node in nodes:
        for field in node["fields"]:
            assert isinstance(field["primary_key"], bool)
            assert isinstance(field["internal_type"], str)
