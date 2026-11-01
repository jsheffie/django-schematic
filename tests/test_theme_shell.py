"""The SPA shell applies the saved theme before any CSS loads (issue #132)."""
import re
from pathlib import Path

import pytest
from django.test import RequestFactory, override_settings

from schematic.views import SchemaView

THEME_TS = Path(__file__).resolve().parents[1] / "ui" / "src" / "lib" / "theme.ts"


@pytest.fixture()
def page(db) -> str:
    with override_settings(DEBUG=True):
        response = SchemaView.as_view()(RequestFactory().get("/"))
    return response.content.decode()


def test_theme_script_runs_in_head_before_the_stylesheet(page):
    head = page.split("</head>")[0]
    script = head.find("dataset.theme")
    stylesheet = head.find('rel="stylesheet"')
    assert script != -1, "no inline theme script in <head>"
    assert stylesheet != -1
    assert script < stylesheet, "a dark page would flash light while the stylesheet loads"


def test_theme_script_reads_the_key_the_app_saves(page):
    app_key = re.search(r'THEME_STORAGE_KEY = "([^"]+)"', THEME_TS.read_text()).group(1)
    assert f'"{app_key}"' in page


def test_theme_script_follows_the_system_setting(page):
    assert "prefers-color-scheme: dark" in page
