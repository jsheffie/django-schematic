# django-schematic

[![Latest on Django Packages](https://img.shields.io/badge/Django%20Packages-django--schematic-8c3c26.svg)](https://djangopackages.org/packages/p/django-schematic/)
[![PyPI version](https://img.shields.io/pypi/v/django-schematic)](https://pypi.org/project/django-schematic/)
[![PyPI downloads](https://img.shields.io/pypi/dm/django-schematic)](https://pypi.org/project/django-schematic/)
[![Python versions](https://img.shields.io/pypi/pyversions/django-schematic)](https://pypi.org/project/django-schematic/)
[![License](https://img.shields.io/pypi/l/django-schematic)](https://github.com/jsheffie/django-schematic/blob/main/LICENSE)
[![Python Tests](https://github.com/jsheffie/django-schematic/actions/workflows/tests.yml/badge.svg)](https://github.com/jsheffie/django-schematic/actions/workflows/tests.yml)
[![UI Tests](https://github.com/jsheffie/django-schematic/actions/workflows/ui-tests.yml/badge.svg)](https://github.com/jsheffie/django-schematic/actions/workflows/ui-tests.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![React Flow](https://img.shields.io/badge/@xyflow%2Freact-React%20Flow-ff0072)](https://reactflow.dev/)
[![d3-force](https://img.shields.io/badge/layout-d3--force-F9A03C?logo=d3dotjs&logoColor=white)](https://d3js.org/d3-force)
[![dagre](https://img.shields.io/badge/layout-dagre-4A90D9)](https://github.com/dagrejs/dagre)
[![ELK](https://img.shields.io/badge/layout-ELK-5C9E4A)](https://eclipse.dev/elk/)

Interactive schema visualization for Django projects.

See all your models, fields, and relationships as an interactive, force-directed graph — directly in your browser. Zero Node.js required at runtime.

## Features

- Export/Import view state as a PNG with location/canvas placement data.
- Export/Import view state as JSON
- Clean JSON API endpoint (`GET /schema/api/`)
- Force-directed layout with physics settle animation (drag-to-pin support)
- Hierarchical layout via dagre
- Click to expand/collapse field lists per model
- App-based color coding
- Show/hide models and apps via sidebar
- Django 5.x + Python 3.12+ only

## Live Demo
- [Live Demo](https://jeffield.net/schema/)

## Visualize

<img width="800" height="450" alt="output" src="https://github.com/user-attachments/assets/f93c55d0-5e25-4e8e-8581-e281c4ed91e6" />


## Frontend Stack

| Aspect | Technology |
|---|---|
| Framework | React 18 |
| Language | TypeScript |
| Graph Visualization | React Flow (`@xyflow/react` 12) |
| Layout Engines | d3-force + dagre + ELK (3 options) |
| UI / Styling | TailwindCSS 4 |
| State Management | Zustand 5 |
| Bundler | Vite 6 |
| Type Safety | Full TypeScript |
| Testing | Vitest + ESLint |
| CDN Dependencies | None (all bundled) |
| Package Manager | npm |

## Exported PNG file with embedded config data

This is an example output PNG file, that can be re-imported into django-schematic


<img width="900" height="495" alt="schematic2-900" src="https://github.com/user-attachments/assets/4c464d60-bb10-4dda-b7f4-33a496024ad1" />


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
