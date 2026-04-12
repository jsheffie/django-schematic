from django.conf import settings

DEFAULTS: dict = {
    "visible": True,
    "include_apps": [],
    "exclude_apps": ["admin", "contenttypes", "sessions", "auth"],
    "exclude_models": {},
    "include_abstract": False,
    "include_proxy": True,
}


def get_setting(key: str):
    user_settings: dict = getattr(settings, "SCHEMATIC", {})
    return user_settings.get(key, DEFAULTS[key])
