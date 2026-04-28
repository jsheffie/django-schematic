from django.conf import settings


def _debug_default(request: object) -> bool:
    return bool(settings.DEBUG)


DEFAULTS: dict = {
    "visible": _debug_default,
    "include_apps": [],
    "exclude_apps": ["admin", "contenttypes", "sessions", "auth"],
    "exclude_models": {},
    "include_abstract": False,
    "include_proxy": True,
    "diagrams_dir": None,
    "diagram_render_timeout": 3000,
    "diagram_boot_timeout": 15000,
}


def get_setting(key: str):
    user_settings: dict = getattr(settings, "SCHEMATIC", {})
    return user_settings.get(key, DEFAULTS[key])
