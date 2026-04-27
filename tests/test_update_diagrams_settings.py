"""Tests for new update_diagrams settings keys."""
import pytest
from django.test import override_settings

from schematic.settings import get_setting


def test_diagrams_dir_defaults_to_none():
    assert get_setting("diagrams_dir") is None


def test_diagram_render_timeout_defaults_to_3000():
    assert get_setting("diagram_render_timeout") == 3000


@override_settings(SCHEMATIC={"diagrams_dir": "docs/diagrams"})
def test_diagrams_dir_is_configurable():
    assert get_setting("diagrams_dir") == "docs/diagrams"


@override_settings(SCHEMATIC={"diagram_render_timeout": 5000})
def test_diagram_render_timeout_is_configurable():
    assert get_setting("diagram_render_timeout") == 5000
