"""Tests for the stale-PNG detection logic in update_diagrams."""
import json
from pathlib import Path
from unittest.mock import patch

import pytest

from schematic.management.commands.update_diagrams import find_stale_pngs
from schematic.png_utils import inject_text_chunk
from tests.test_png_utils import make_minimal_png


def make_diagram_png(visible_node_ids: list[str]) -> bytes:
    config = json.dumps({"version": 2, "visibleNodeIds": visible_node_ids})
    return inject_text_chunk(make_minimal_png(), "schematic", config)


def write_png(tmp_path: Path, name: str, visible_node_ids: list[str]) -> Path:
    p = tmp_path / name
    p.write_bytes(make_diagram_png(visible_node_ids))
    return p


# ---------------------------------------------------------------------------
# find_stale_pngs(diagrams_dir, changed_model_ids) -> list[Path]
# ---------------------------------------------------------------------------


def test_no_pngs_returns_empty(tmp_path):
    result = find_stale_pngs(tmp_path, {"auth.User"})
    assert result == []


def test_png_with_no_text_chunk_is_skipped(tmp_path):
    (tmp_path / "bare.png").write_bytes(make_minimal_png())
    result = find_stale_pngs(tmp_path, {"auth.User"})
    assert result == []


def test_png_not_matching_changed_models_is_clean(tmp_path):
    write_png(tmp_path, "orders.png", ["orders.Order", "orders.LineItem"])
    result = find_stale_pngs(tmp_path, {"auth.User"})
    assert result == []


def test_png_matching_one_changed_model_is_stale(tmp_path):
    p = write_png(tmp_path, "auth.png", ["auth.User", "auth.Group"])
    result = find_stale_pngs(tmp_path, {"auth.User"})
    assert p in result


def test_multiple_pngs_only_affected_one_is_stale(tmp_path):
    auth_png = write_png(tmp_path, "auth.png", ["auth.User", "auth.Group"])
    write_png(tmp_path, "orders.png", ["orders.Order"])
    result = find_stale_pngs(tmp_path, {"auth.User"})
    assert auth_png in result
    assert len(result) == 1


def test_multiple_changed_models_can_affect_multiple_pngs(tmp_path):
    auth_png = write_png(tmp_path, "auth.png", ["auth.User"])
    orders_png = write_png(tmp_path, "orders.png", ["orders.Order"])
    result = find_stale_pngs(tmp_path, {"auth.User", "orders.Order"})
    assert auth_png in result
    assert orders_png in result


def test_non_png_files_are_ignored(tmp_path):
    (tmp_path / "notes.txt").write_text("hello")
    result = find_stale_pngs(tmp_path, {"auth.User"})
    assert result == []
