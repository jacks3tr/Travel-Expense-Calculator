# Travel Estimator

Travel Estimator is an open-source desktop and web application for planning event travel budgets with consistent, auditable calculations.

## What It Does

- Builds total travel estimates from flights, lodging, car rentals, meals, labor, and seasonal variance
- Uses the same calculation engine across desktop and web for consistent results
- Keeps planner-entered rates and assumptions fully under user control
- Provides optional reference data as guidance only

## Local Development

### Web App

```bash
npm ci
npm run dev:web
```

### Desktop App (dev build)

```bash
npm ci
cargo build -p desktop-tauri
```

## GitHub Pages Hosting

This repository deploys the web app using GitHub Actions:

- Workflow: `.github/workflows/deploy-pages.yml`
- Build output: `apps/web/dist`
- Production URL: `https://jacks3tr.github.io/Travel-Expense-Calculator/`

Required one-time GitHub setting:

1. Open repository `Settings` > `Pages`
2. Set `Source` to `GitHub Actions`

The Pages build uses `VITE_BASE_PATH=/Travel-Expense-Calculator/` in CI, while local builds keep the default `/` base path.

## Desktop Installer Build (Windows)

Build a local NSIS installer `.exe`:

```bash
npm ci
npx tauri build --bundles nsis --config apps/desktop-tauri/src-tauri/tauri.conf.json
```

Installer output folder:

- `apps/desktop-tauri/src-tauri/target/release/bundle/nsis/`

## Releases

Windows installer builds are published to GitHub Releases as `.exe` assets for each tagged release.

- Releases: `../../releases`
- Installer type: NSIS `.exe`

## Support

For issues or feature requests, open a ticket in the repository issue tracker.
