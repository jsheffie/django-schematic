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

## Screenshots

<img width="1712" height="943" alt="Screenshot 2026-04-12 at 11 13 05 PM" src="https://github.com/user-attachments/assets/7048a332-fec1-420f-b331-52b6da2eb5ef" />
<img width="1337" height="928" alt="Screenshot 2026-04-12 at 11 13 46 PM" src="https://github.com/user-attachments/assets/5f8776c2-e62c-4154-8a49-c77282d4857e" />
<img width="996" height="865" alt="Screenshot 2026-04-12 at 11 15 06 PM" src="https://github.com/user-attachments/assets/9feb182b-921d-4765-88eb-cf0a5f845400" />


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
