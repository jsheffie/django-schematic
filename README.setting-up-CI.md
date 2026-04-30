# Setting Up the CI/CD Pipeline for Auto-Updating Schema Diagrams

django-schematic includes an optional `update_diagrams` management command that automatically re-renders your PNG schema diagrams when your Django models change. This is useful in CI/CD pipelines to keep committed diagram PNGs in sync with the codebase.

Watch the [CI/CD Pipeline Demo on YouTube](https://www.youtube.com/watch?v=KzHT0PHu2cc) to see it in action.

A working reference implementation is available at [django_schematic_many_megan_testbed](https://github.com/jsheffie/django_schematic_many_megan_testbed).

---

## How It Works

1. You commit one or more PNG schema diagrams to your repo (exported from the django-schematic UI, which embeds model metadata in the file).
2. On each run, `update_diagrams` diffs against `main` to find changed model files, checks which PNGs reference those models, and re-renders only the affected diagrams using a headless Chromium browser.
3. The updated PNGs can be committed back to the repo automatically in CI.

---

## Prerequisites

- `django-schematic[ci]` installed (pulls in `playwright`)
- Playwright's Chromium browser binary installed
- A `diagrams_dir` setting pointing to the directory containing your PNG diagrams
- At least one seed PNG exported from the django-schematic UI

---

## Local Setup

### 1. Install with the CI extra

```bash
pip install "django-schematic[ci]"
playwright install chromium
```

### 2. Create a diagrams directory and add a seed PNG

Export a PNG from the django-schematic UI (use the export button), then place it in your diagrams directory:

```bash
mkdir -p docs/diagrams
cp ~/Downloads/my_schema.png docs/diagrams/
```

### 3. Configure `diagrams_dir` in settings

```python
# settings.py
SCHEMATIC = {
    "diagrams_dir": BASE_DIR / "docs/diagrams",
}
```

### 4. Test with a dry run

```bash
python manage.py update_diagrams --dry-run
```

This confirms the command finds your PNG without rendering anything. Then run for real:

```bash
python manage.py update_diagrams
```

Pass `-v 2` to see the git diff of changed model files:

```bash
python manage.py update_diagrams -v 2
```

---

## Docker Setup

Playwright requires several system libraries for headless Chromium. Add these to your Dockerfile before running `playwright install chromium`:

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libnss3 \
    libnspr4 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxcb1 \
    libxkbcommon0 \
    libatspi2.0-0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

RUN playwright install chromium
```

---

## GitHub Actions Example

Add a step after migrations to re-render diagrams and commit the result:

```yaml
- name: Update schema diagrams
  run: |
    python manage.py update_diagrams -v 2

- name: Commit updated diagrams
  run: |
    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"
    git add docs/diagrams/
    git diff --cached --quiet || git commit -m "chore: update schema diagrams"
    git push
```

---

## Google Cloud Build Example

The testbed repo uses Cloud Build to build and deploy the app, then run `update_diagrams` as part of the deploy step. See [many_megan_deploy/cloudbuild.yaml](https://github.com/jsheffie/django_schematic_many_megan_testbed/blob/main/many_megan_deploy/cloudbuild.yaml) for the full configuration.

---

## Troubleshooting

**`playwright install chromium` fails inside Docker** — Install the system dependencies listed above *before* running the playwright install step.

**`update_diagrams` finds no PNGs** — Confirm `SCHEMATIC["diagrams_dir"]` points to the correct directory and that the PNG was exported from the django-schematic UI (not a plain screenshot — it must contain embedded metadata).

**Diagrams re-render all models instead of only the changed ones** — Make sure you are on a branch with a clean `main` to diff against. The command uses `git diff main` to detect changed model files.
