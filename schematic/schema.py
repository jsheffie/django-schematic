"""
Schema extraction — walks Django's app registry and model._meta API to build
a serializable graph of nodes (models) and edges (relationships).
"""
from __future__ import annotations

import dataclasses
import json
from typing import TYPE_CHECKING

from django.apps import apps as django_apps

from .settings import get_setting

if TYPE_CHECKING:
    from django.db import models as django_models


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------


@dataclasses.dataclass(frozen=True, order=True)
class FieldInfo:
    name: str
    field_type: str
    is_relation: bool
    null: bool
    unique: bool


@dataclasses.dataclass(frozen=True, order=True)
class NodeInfo:
    id: str          # e.g. "myapp.Order"
    name: str        # e.g. "Order"
    app_label: str   # e.g. "myapp"
    tags: tuple[str, ...]   # "abstract", "proxy"
    fields: tuple[FieldInfo, ...]


@dataclasses.dataclass(frozen=True, order=True)
class EdgeInfo:
    source: str       # NodeInfo.id
    target: str       # NodeInfo.id
    relation_type: str  # "fk" | "o2o" | "m2m" | "subclass" | "proxy"
    field_name: str
    related_name: str | None


@dataclasses.dataclass(frozen=True)
class SchemaGraph:
    nodes: tuple[NodeInfo, ...]
    edges: tuple[EdgeInfo, ...]
    app_labels: tuple[str, ...]

    def to_dict(self) -> dict:
        return dataclasses.asdict(self)

    def to_json(self) -> str:
        return json.dumps(self.to_dict())


# ---------------------------------------------------------------------------
# Extraction
# ---------------------------------------------------------------------------


def _node_id(model: type[django_models.Model]) -> str:
    return f"{model._meta.app_label}.{model.__name__}"


def _extract_fields(model: type[django_models.Model]) -> tuple[FieldInfo, ...]:
    fields = []
    for f in model._meta.get_fields():
        if not hasattr(f, "column"):
            # Reverse relations — skip; they appear as edges from the other side
            continue
        fields.append(
            FieldInfo(
                name=f.name,
                field_type=type(f).__name__,
                is_relation=f.is_relation if hasattr(f, "is_relation") else False,
                null=getattr(f, "null", False),
                unique=getattr(f, "unique", False),
            )
        )
    return tuple(sorted(fields))


def _tags(model: type[django_models.Model]) -> tuple[str, ...]:
    tags = []
    if model._meta.abstract:
        tags.append("abstract")
    if model._meta.proxy:
        tags.append("proxy")
    return tuple(tags)


def _extract_edges(
    model: type[django_models.Model],
    all_model_ids: set[str],
) -> list[EdgeInfo]:
    edges: list[EdgeInfo] = []
    source = _node_id(model)

    for f in model._meta.get_fields():
        if not getattr(f, "is_relation", False):
            continue
        if not hasattr(f, "related_model") or f.related_model is None:
            continue
        target = _node_id(f.related_model)
        if target not in all_model_ids:
            continue

        # Skip reverse accessors — process each relationship once from the owning side
        if hasattr(f, "field") and not hasattr(f, "column"):
            continue

        from django.db.models import ForeignKey, ManyToManyField, OneToOneField

        if isinstance(f, OneToOneField):
            rel = "o2o"
        elif isinstance(f, ForeignKey):
            rel = "fk"
        elif isinstance(f, ManyToManyField):
            rel = "m2m"
        else:
            rel = "fk"

        edges.append(
            EdgeInfo(
                source=source,
                target=target,
                relation_type=rel,
                field_name=f.name,
                related_name=getattr(f, "related_query_name", lambda: None)() or None,
            )
        )

    # Subclass edges (multi-table inheritance and proxy)
    for parent in model.__bases__:
        if not hasattr(parent, "_meta"):
            continue
        parent_id = _node_id(parent)  # type: ignore[arg-type]
        if parent_id not in all_model_ids:
            continue
        rel = "proxy" if model._meta.proxy else "subclass"
        edges.append(
            EdgeInfo(
                source=source,
                target=parent_id,
                relation_type=rel,
                field_name="",
                related_name=None,
            )
        )

    return edges


def build_schema(filter_apps: list[str] | None = None) -> SchemaGraph:
    """
    Walk the Django app registry and return a SchemaGraph.

    filter_apps: if provided, only include models from these app labels.
    """
    exclude_apps: list[str] = get_setting("exclude_apps")
    exclude_models: dict[str, list[str]] = get_setting("exclude_models")
    include_abstract: bool = get_setting("include_abstract")
    include_proxy: bool = get_setting("include_proxy")
    include_apps: list[str] = get_setting("include_apps")

    # Determine which apps to include
    all_app_configs = django_apps.get_app_configs()
    app_configs = [
        ac for ac in all_app_configs
        if ac.label not in exclude_apps
        and (not include_apps or ac.label in include_apps)
        and (not filter_apps or ac.label in filter_apps)
    ]

    # Collect all models
    all_models: list[type[django_models.Model]] = []
    for ac in app_configs:
        for model in ac.get_models():
            if model._meta.abstract and not include_abstract:
                continue
            if model._meta.proxy and not include_proxy:
                continue
            excluded = exclude_models.get(ac.label, [])
            if model.__name__ in excluded:
                continue
            all_models.append(model)

    all_model_ids = {_node_id(m) for m in all_models}

    nodes = tuple(
        sorted(
            NodeInfo(
                id=_node_id(m),
                name=m.__name__,
                app_label=m._meta.app_label,
                tags=_tags(m),
                fields=_extract_fields(m),
            )
            for m in all_models
        )
    )

    edges: list[EdgeInfo] = []
    for m in all_models:
        edges.extend(_extract_edges(m, all_model_ids))

    app_labels = tuple(sorted({n.app_label for n in nodes}))

    return SchemaGraph(nodes=nodes, edges=tuple(edges), app_labels=app_labels)
