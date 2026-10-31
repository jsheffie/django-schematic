"""The UI shows the version from ui/package.json (issue #128); it must match the PyPI release."""

import json
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def test_ui_package_version_matches_pyproject() -> None:
    pyproject = tomllib.loads((ROOT / "pyproject.toml").read_text())
    package = json.loads((ROOT / "ui" / "package.json").read_text())
    assert package["version"] == pyproject["project"]["version"], (
        "Bump ui/package.json and pyproject.toml together: the UI displays the package.json version"
    )
