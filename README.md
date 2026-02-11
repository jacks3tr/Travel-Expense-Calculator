# Travel Estimator

Travel Estimator is being modernized from a single-file Python desktop app into a shared-core product with both desktop and web delivery.

## Architecture

- Legacy app: `Travel Expense Calculator.py` (CustomTkinter + Python formulas)
- Shared domain core: `packages/calc-core-rust`
- WASM bridge for web: `packages/calc-core-wasm`
- Web UI shell: `apps/web` (React + TypeScript + Vite)
- Desktop shell: `apps/desktop-tauri/src-tauri` (Tauri v2 + Rust)

Manual planner inputs are authoritative. Reference lookup data is advisory only and never writes back into planner inputs.

## Formula Model

The modern core preserves legacy parity:

- `flight = avg_flight * people * trips`
- `car = car_daily * days * cars`
- `hotel = hotel_nightly * people * days`
- `food = food_daily * people * days`
- `labor = hourly_comm * hours * people`
- `variance = (flight + car + hotel + food) * seasonal_var_pct / 100`
- `total = flight + car + hotel + food + variance + labor`

## Local Development

### Prerequisites

- Node.js LTS
- Rust stable toolchain
- Tauri v2 prerequisites for Windows packaging
- Optional: `wasm-pack` for direct wasm package builds

### Commands

- Install: `npm install`
- Run web: `npm run dev:web`
- Build web: `npm run build:web`
- Build desktop rust target: `npm run build:desktop`
- Build wasm package: `npm run build:wasm`
- Run tests (web + rust): `npm test`

## Desktop Installer and Update Flow

- Release workflow: `.github/workflows/release.yml`
- Desktop app can query GitHub latest release endpoint for update availability.
- v1 behavior is prompt-only update notification (no silent background install).

## Reference Check Behavior

Web reference lookup uses `apps/web/public/reference-data/mock-reference.csv` as fallback.

- Advisory-only lookup panel
- Non-fatal fallback behavior on provider failure
- No mutation of planner rates/events

## Migration Utility

Convert legacy saved JSON payloads into normalized schema:

- `python scripts/migrate.py --in old.json --out new.json`

## Current Status

- Core scaffolding complete for desktop/web/shared-core modernization
- Rust parity tests included
- Web estimator, word-table formatter, charts, and reference adapter included
- Desktop update-check module scaffolded for Tauri integration
