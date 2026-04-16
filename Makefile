# Rapid UI development deploy workflow.
# Copies built static assets directly into a local Django project's venv,
# bypassing PyPI for fast edit → build → test iteration.
#
# One-time setup:
#   cp .env.deploy.example .env.deploy
#   # Edit .env.deploy and set DEPLOY_TARGET to the path printed by:
#   # python -c "import schematic, os; print(os.path.join(os.path.dirname(schematic.__file__), 'static', 'schematic'))"
#
# Usage:
#   make ui-deploy               # build once and copy
#   make ui-watch                # continuous rebuild + auto-copy on save
#   make ui-deploy DEPLOY_TARGET=/some/path   # override path from shell

-include .env.deploy

SRC_DIR := schematic/static/schematic

.PHONY: ui-build ui-deploy ui-watch _do-copy _do-copy-python

## Build the UI without type-checking (fast).
ui-build:
	cd ui && npm run build:fast

## Build and copy main.js + main.css to DEPLOY_TARGET, and copy Python source files.
ui-deploy: ui-build _do-copy _do-copy-python

## Validate DEPLOY_TARGET and copy the built assets.
_do-copy:
	@if [ -z "$(DEPLOY_TARGET)" ]; then \
		echo "ERROR: DEPLOY_TARGET is not set."; \
		echo "  Copy .env.deploy.example to .env.deploy and set DEPLOY_TARGET, or pass it directly:"; \
		echo "    make ui-deploy DEPLOY_TARGET=/path/to/venv/.../schematic/static/schematic"; \
		exit 1; \
	fi
	@if [ ! -d "$(DEPLOY_TARGET)" ]; then \
		echo "ERROR: DEPLOY_TARGET directory does not exist: $(DEPLOY_TARGET)"; \
		exit 1; \
	fi
	cp $(SRC_DIR)/main.js  $(DEPLOY_TARGET)/main.js
	cp $(SRC_DIR)/main.css $(DEPLOY_TARGET)/main.css
	@echo "Copied -> $(DEPLOY_TARGET)"

## Copy Python source files to PYTHON_DEPLOY_TARGET.
## For Docker-based test projects, point this at the schematic_py_src/ directory
## that is volume-mounted into the container (see local.yml in the test project).
_do-copy-python:
	@if [ -z "$(PYTHON_DEPLOY_TARGET)" ]; then \
		echo "Skipping Python deploy (PYTHON_DEPLOY_TARGET not set)."; \
	else \
		cp schematic/*.py $(PYTHON_DEPLOY_TARGET)/; \
		echo "Copied Python -> $(PYTHON_DEPLOY_TARGET)"; \
	fi

## Continuous rebuild + auto-copy on each output change.
## Requires fswatch (brew install fswatch). Falls back to a polling loop.
ui-watch:
	@if [ -z "$(DEPLOY_TARGET)" ]; then \
		echo "ERROR: DEPLOY_TARGET is not set. See .env.deploy.example."; \
		exit 1; \
	fi
	@echo "Starting vite build --watch in background..."
	cd ui && npm run watch &
	@if command -v fswatch >/dev/null 2>&1; then \
		echo "Watching $(SRC_DIR)/main.js with fswatch. Copy target: $(DEPLOY_TARGET)"; \
		fswatch -o $(SRC_DIR)/main.js | xargs -n1 -I{} $(MAKE) _do-copy _do-copy-python; \
	else \
		echo "WARNING: fswatch not found. Install it for better performance:"; \
		echo "  brew install fswatch"; \
		echo "Falling back to polling loop (2s interval)..."; \
		last=""; \
		while true; do \
			current=$$(stat -f "%m" $(SRC_DIR)/main.js 2>/dev/null || stat -c "%Y" $(SRC_DIR)/main.js 2>/dev/null); \
			if [ "$$current" != "$$last" ] && [ -n "$$last" ]; then \
				$(MAKE) _do-copy _do-copy-python; \
			fi; \
			last="$$current"; \
			sleep 2; \
		done; \
	fi
