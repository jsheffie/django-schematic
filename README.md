# django-schematic

Interactive schema visualization for Django projects.

See all your models, fields, and relationships as an interactive, force-directed graph — directly in your browser. Zero Node.js required at runtime.

## Features

- Force-directed layout with physics settle animation (drag-to-pin support)
- Hierarchical layout via dagre
- Click to expand/collapse field lists per model
- App-based color coding
- Show/hide models and apps via sidebar
- Export/import view state as JSON
- Export diagram as PNG
- Clean JSON API endpoint (`GET /schema/api/`)
- Django 5.x + Python 3.12+ only

## Exported PNG file with embeded SVG data

This is an example output PNG file, that can be re-imported into djang-schematic

<img width="1200" height="898" alt="DailyGrindStatus-Blog-schematic" src="https://github.com/user-attachments/assets/3fbeae62-68c1-45fe-9ae6-7b52ed77585e" />



## Quick Start

```bash
pip install django-schematic
```

Add to `INSTALLED_APPS`:

```python
INSTALLED_APPS = [
    ...
    "schematic",
]
```

Add to `urls.py`:

```python
from django.urls import include, path

urlpatterns = [
    ...
    path("schema/", include("schematic.urls")),
]
```

Visit `http://localhost:8000/schema/` — your model graph will be there.

## Security

The viewer is only accessible when `DEBUG = True`. In production (`DEBUG = False`) both the HTML view and the API return 404, making the URL appear non-existent.

To expose the viewer in production behind your own auth layer, set the `visible` option to a callable:

```python
SCHEMATIC = {
    "visible": lambda request: request.user.is_staff,
}
```

## Configuration

```python
# settings.py (all optional — these are the defaults)
SCHEMATIC = {
    "visible": lambda request: settings.DEBUG,  # or any callable, or True/False
    "include_apps": [],           # empty = all apps
    "exclude_apps": ["admin", "contenttypes", "sessions", "auth"],
    "exclude_models": {},         # {"myapp": ["InternalModel"]}
    "include_abstract": False,
    "include_proxy": True,
}
```

## API

The schema is also available as JSON:

```
GET /schema/api/
GET /schema/api/?apps=myapp,otherapp
```

## Development

```bash
# Backend
pip install -e ".[dev]"
pytest

# Frontend
cd ui
npm install
npm run dev   # Vite dev server with HMR
npm run build # Outputs to schematic/static/schematic/
```

## License

MIT
