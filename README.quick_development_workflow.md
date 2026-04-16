# Quick Development Workflow

This document describes the fast loop for iterating on the React/TypeScript UI without going through PyPI.

The standard path (edit → PyPI release → pip install in test project) is too slow for frontend iteration. Instead, you build the static assets locally and copy `main.js` + `main.css` directly into the installed package location inside your test project's venv.

---

## Prerequisites

- Node.js and npm installed
- `django-schematic` already pip-installed into your target test project's venv (any version)
- macOS: optionally `fswatch` for efficient file watching (`brew install fswatch`)

---

## One-time setup

### 1. Find DEPLOY_TARGET

In your target Django project, activate its venv and run:

```bash
python -c "import schematic, os; print(os.path.join(os.path.dirname(schematic.__file__), 'static', 'schematic'))"
```

The output will look like:
```
/Users/you/projects/myapp/.venv/lib/python3.12/site-packages/schematic/static/schematic
```

### 2. Create .env.deploy

Back in the `django-schematic` repo root:

```bash
cp .env.deploy.example .env.deploy
```

Edit `.env.deploy` and replace the placeholder with the path from step 1:

```
DEPLOY_TARGET=/Users/you/projects/myapp/.venv/lib/python3.12/site-packages/schematic/static/schematic
```

`.env.deploy` is gitignored — it lives only on your machine.

---

## Manual one-shot deploy

After editing files in `ui/src/`:

```bash
make ui-deploy
```

This runs `vite build` (no type-checking) and copies `main.js` + `main.css` to `DEPLOY_TARGET`. Output:

```
Copied -> /Users/you/projects/myapp/.venv/lib/python3.12/site-packages/schematic/static/schematic
```

Then refresh your browser — no Django server restart needed (static files are served directly).

You can also pass `DEPLOY_TARGET` inline without editing `.env.deploy`:

```bash
make ui-deploy DEPLOY_TARGET=/some/other/path
```

---

## Continuous watch mode (two terminals)

**Terminal 1** — auto-rebuild on every save:

```bash
cd ui && npm run watch
```

Vite will rebuild `main.js` + `main.css` into `schematic/static/schematic/` each time a source file changes.

**Terminal 2** — auto-copy on each rebuild:

```bash
make ui-watch
```

If `fswatch` is installed, it watches `main.js` for modification events and calls `_do-copy` immediately. If not, it falls back to a 2-second polling loop and suggests `brew install fswatch`.

---

## build:fast vs npm run build

| Command | Type-check | Speed | Use when |
|---------|-----------|-------|----------|
| `npm run build:fast` (used by `make ui-deploy`) | No | Fast | Dev iteration |
| `npm run build` | Yes (`tsc --noEmit`) | Slower | Pre-commit, CI, releases |

Always use `npm run build` before committing to catch type errors. The committed `schematic/static/schematic/main.js` and `main.css` must come from the full build.

---

## How it works

The Makefile reads `DEPLOY_TARGET` from `.env.deploy` via `-include .env.deploy`, so the file is optional. If the variable is set in your shell environment, that takes precedence over the file. The `ui-deploy` target validates that `DEPLOY_TARGET` is set and that the directory exists before copying anything.
