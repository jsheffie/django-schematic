"""Physical database names in the schema export (issue #135).

A tool watching the database (e.g. logical replication) sees table and column
names, not model and field names; these let it map what it sees back to the
diagram without guessing Django's naming conventions.
"""
import json

import pytest
from django.db import models

from schematic.schema import _db_table, build_schema


@pytest.fixture(scope="module")
def schema():
    return build_schema(filter_apps=["testapp"])


def node(schema, node_id):
    return next(n for n in schema.nodes if n.id == node_id)


def field(schema, node_id, name):
    return next(f for f in node(schema, node_id).fields if f.name == name)


def edge(schema, source, field_name):
    return next(e for e in schema.edges if e.source == source and e.field_name == field_name)


def test_node_carries_default_db_table(schema):
    assert node(schema, "testapp.Author").db_table == "testapp_author"


def test_node_carries_renamed_db_table(schema):
    assert node(schema, "testapp.LegacyOrder").db_table == "acme_legacy_orders"


def test_abstract_model_has_no_table():
    class Stamped(models.Model):
        class Meta:
            app_label = "testapp"
            abstract = True

    assert _db_table(Stamped) is None


def test_field_carries_its_column(schema):
    assert field(schema, "testapp.Author", "name").column == "name"


def test_field_carries_renamed_db_column(schema):
    assert field(schema, "testapp.LegacyOrder", "quantity").column == "qty_ordered"


def test_foreign_key_column_has_the_id_suffix(schema):
    assert field(schema, "testapp.LegacyOrder", "book").column == "book_id"


def test_many_to_many_field_has_no_column(schema):
    # Its rows live in the through table, carried on the m2m edge.
    assert field(schema, "testapp.Book", "tags").column is None


def test_auto_created_m2m_edge_carries_its_through_table(schema):
    assert edge(schema, "testapp.Book", "tags").through_db_table == "testapp_book_tags"


def test_explicit_through_m2m_edge_carries_its_through_table(schema):
    assert edge(schema, "testapp.BookWithThrough", "tags").through_db_table == "testapp_booktaglink"


def test_other_edges_have_no_through_table(schema):
    assert edge(schema, "testapp.LegacyOrder", "book").through_db_table is None


def test_db_names_serialized_in_json(schema):
    data = json.loads(schema.to_json())
    legacy = next(n for n in data["nodes"] if n["id"] == "testapp.LegacyOrder")
    assert legacy["db_table"] == "acme_legacy_orders"
    assert {f["name"]: f["column"] for f in legacy["fields"]}["quantity"] == "qty_ordered"
    m2m = next(e for e in data["edges"] if e["source"] == "testapp.Book" and e["field_name"] == "tags")
    assert m2m["through_db_table"] == "testapp_book_tags"
