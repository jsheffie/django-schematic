
What the command needs

  1. A diagrams_dir — a directory containing your PNG file, so the command can scan it
  2. The PNG in that directory — copied from ~/Downloads/schematic_library.png
  3. diagrams_dir in settings — so the command knows where to look
  4. playwright installed with its browser — required for the render phase (already pulled in via [ci] extra, but browser needs a separate install step)

  ---
  Step 1 — Create the diagrams directory and copy the PNG

  Run this in the project root:

  mkdir -p docs/diagrams
  cp ~/Downloads/schematic_library.png docs/diagrams/

  ---
  Step 2 — Add diagrams_dir to your local settings

  The command reads from SCHEMATIC['diagrams_dir']. For local testing, add it to your local Django settings. Open .envs/.local/.django or wherever you want — but the
  cleanest place is config/settings/local.py. Add to the SCHEMATIC block there (or create one if it doesn't exist):

  SCHEMATIC = {
      "diagrams_dir": BASE_DIR / "docs/diagrams",
      "diagram_render_timeout": 5000,
  }

  Can you show me what's currently in config/settings/local.py so I can tell you exactly what to add/change without stomping anything?

  ---
  Step 3 — Install Playwright's browser (one-time, inside Docker)

  After the container builds with the new [ci] requirement, you'll need to install the Chromium browser binary:

  docker compose -f local.yml run --rm django playwright install chromium
  Note: this does not work well, I set it up in my Docker steps.
  
  ---
  Step 4 — Run the command

  First try --dry-run to confirm it finds your PNG without actually rendering:

  docker compose -f local.yml run --rm django python manage.py update_diagrams --dry-run

  The command diffs against main to find changed model IDs, then checks which PNGs contain those model IDs in their schematic tEXt chunk. Your PNG has visibleNodeIds
  embedded in it — I confirmed that above.

  Then run for real:

  docker compose -f local.yml run --rm django python manage.py update_diagrams

  