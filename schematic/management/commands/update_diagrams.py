"""
Management command: update_diagrams

Detects which PNG schema diagrams are stale (their visible models changed in
the current branch), re-renders them via a headless Playwright session, and
leaves the updated files on disk for the user to review and commit.
"""
from __future__ import annotations

import json
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

from django.apps import apps as django_apps
from django.core.management.base import BaseCommand, CommandError

from schematic.png_utils import extract_text_chunk, inject_text_chunk
from schematic.settings import get_setting


# ---------------------------------------------------------------------------
# Detection helpers
# ---------------------------------------------------------------------------


def find_stale_pngs(diagrams_dir: Path, changed_model_ids: set[str]) -> list[Path]:
    """Return paths to PNGs whose visibleNodeIds overlap with changed_model_ids."""
    stale: list[Path] = []
    for png_path in sorted(diagrams_dir.glob("*.png")):
        json_text = extract_text_chunk(png_path.read_bytes(), "schematic")
        if json_text is None:
            continue
        try:
            config = json.loads(json_text)
            visible = set(config.get("visibleNodeIds", []))
        except (json.JSONDecodeError, AttributeError):
            continue
        if visible & changed_model_ids:
            stale.append(png_path)
    return stale


def get_changed_files(base_branch: str) -> list[str]:
    """Return list of .py file paths changed relative to base_branch."""
    result = subprocess.run(
        ["git", "diff", "--name-only", f"{base_branch}...HEAD"],
        capture_output=True,
        text=True,
        check=True,
    )
    return [f for f in result.stdout.splitlines() if f.endswith(".py")]


def changed_model_ids_from_files(changed_files: list[str]) -> set[str]:
    """
    Map changed .py files to Django model IDs (app_label.ModelName) using the
    app registry. Any .py file change in an app marks all that app's models as
    potentially changed — app-level granularity avoids false negatives.
    """
    # Build map: source directory prefix → app_label
    app_dir_map: dict[str, str] = {}
    for ac in django_apps.get_app_configs():
        app_path = str(Path(ac.path))
        app_dir_map[app_path] = ac.label

    changed_app_labels: set[str] = set()
    for filepath in changed_files:
        abs_path = str(Path(filepath).resolve())
        for app_path, label in app_dir_map.items():
            if abs_path.startswith(app_path):
                changed_app_labels.add(label)
                break

    model_ids: set[str] = set()
    for ac in django_apps.get_app_configs():
        if ac.label in changed_app_labels:
            for model in ac.get_models():
                model_ids.add(f"{ac.label}.{model.__name__}")
    return model_ids


# ---------------------------------------------------------------------------
# Server management
# ---------------------------------------------------------------------------


def _free_port() -> int:
    with socket.socket() as s:
        s.bind(("", 0))
        return s.getsockname()[1]


def start_dev_server(port: int) -> subprocess.Popen:  # type: ignore[type-arg]
    return subprocess.Popen(
        [sys.executable, "manage.py", "runserver", f"127.0.0.1:{port}", "--noreload"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def wait_for_server(port: int, timeout: int = 15) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{port}/schema/api/", timeout=1)
            return True
        except Exception:
            time.sleep(0.5)
    return False


# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------


def render_png(schema_url: str, config_json: str, render_timeout: int) -> bytes:
    """Use Playwright to load the schema page, import config, export PNG bytes."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise CommandError(
            "Playwright is required for rendering. "
            "Install it with: pip install 'django-schematic[ci]' && playwright install chromium"
        ) from exc

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(schema_url)
        page.evaluate(f"window.__schematic.importConfig({json.dumps(config_json)})")
        page.wait_for_timeout(render_timeout)
        b64: str = page.evaluate("window.__schematic.exportPngBytes()")
        browser.close()

    import base64
    return base64.b64decode(b64)


# ---------------------------------------------------------------------------
# Management command
# ---------------------------------------------------------------------------


class Command(BaseCommand):
    help = "Re-render stale PNG schema diagrams whose models changed in the current branch."

    def add_arguments(self, parser):  # type: ignore[override]
        parser.add_argument(
            "--base-branch",
            default="main",
            help="Git branch to diff against (default: main)",
        )
        parser.add_argument(
            "--diagrams-dir",
            default=None,
            help="Override SCHEMATIC['diagrams_dir'] setting",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Detect and report stale PNGs without re-rendering",
        )

    def handle(self, *args, **options):  # type: ignore[override]
        diagrams_dir_raw = options["diagrams_dir"] or get_setting("diagrams_dir")
        if not diagrams_dir_raw:
            raise CommandError(
                "diagrams_dir is not configured. "
                "Set SCHEMATIC['diagrams_dir'] in your settings or pass --diagrams-dir."
            )
        diagrams_dir = Path(diagrams_dir_raw)
        if not diagrams_dir.is_dir():
            raise CommandError(f"diagrams_dir does not exist: {diagrams_dir}")

        render_timeout = get_setting("diagram_render_timeout")
        base_branch = options["base_branch"]
        dry_run = options["dry_run"]

        # Phase 1: detect
        self.stdout.write(f"Diffing against {base_branch}...")
        try:
            changed_files = get_changed_files(base_branch)
        except subprocess.CalledProcessError as exc:
            raise CommandError(f"git diff failed: {exc}") from exc

        changed_ids = changed_model_ids_from_files(changed_files)
        self.stdout.write(f"Changed model candidates: {sorted(changed_ids) or 'none'}")

        stale = find_stale_pngs(diagrams_dir, changed_ids)
        if not stale:
            self.stdout.write(self.style.SUCCESS("All diagrams are up to date."))
            return

        self.stdout.write(f"Stale diagrams ({len(stale)}):")
        for p in stale:
            self.stdout.write(f"  {p}")

        if dry_run:
            self.stdout.write("--dry-run: skipping render.")
            return

        # Phase 2: render
        port = _free_port()
        schema_url = f"http://127.0.0.1:{port}/schema/"
        server = start_dev_server(port)
        try:
            self.stdout.write(f"Starting dev server on port {port}...")
            if not wait_for_server(port):
                raise CommandError("Dev server did not start within 15 seconds.")

            for png_path in stale:
                config_json = extract_text_chunk(png_path.read_bytes(), "schematic")
                if config_json is None:
                    self.stderr.write(f"Warning: no config in {png_path}, skipping.")
                    continue
                self.stdout.write(f"Rendering {png_path.name}...")
                try:
                    png_bytes = render_png(schema_url, config_json, render_timeout)
                except Exception as exc:
                    self.stderr.write(f"Warning: render failed for {png_path.name}: {exc}")
                    continue

                with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                    tmp.write(png_bytes)
                    tmp_path = Path(tmp.name)
                tmp_path.replace(png_path)
                self.stdout.write(self.style.SUCCESS(f"  Updated: {png_path.name}"))
        finally:
            server.terminate()
            server.wait()

        self.stdout.write(self.style.SUCCESS("Done. Review changes and commit when ready."))
