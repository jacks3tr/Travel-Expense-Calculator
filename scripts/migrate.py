#!/usr/bin/env python3
import argparse
import json
from pathlib import Path

LEGACY_EVENT_KEYS = ["name", "trips", "days", "people", "cars", "hours"]


def migrate(payload: dict) -> dict:
    rates = payload.get("rates", {})
    events = payload.get("events", [])

    normalized_events = []
    for idx, event in enumerate(events):
        normalized = {"id": f"event-{idx + 1}"}
        for key in LEGACY_EVENT_KEYS:
            normalized[key] = event.get(key)
        normalized_events.append(normalized)

    return {
        "schemaVersion": "1.0.0",
        "rates": {
            "avg_flight": float(rates.get("avg_flight", 0)),
            "car_daily": float(rates.get("car_daily", 0)),
            "hotel_nightly": float(rates.get("hotel_nightly", 0)),
            "hourly_comm": float(rates.get("hourly_comm", 0)),
            "food_daily": float(rates.get("food_daily", 0)),
            "seasonal_var_pct": float(rates.get("seasonal_var", rates.get("seasonal_var_pct", 0))),
        },
        "events": normalized_events,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate legacy travel estimator JSON payload.")
    parser.add_argument("--in", dest="input_path", required=True, help="Path to legacy JSON")
    parser.add_argument("--out", dest="output_path", required=True, help="Path to write normalized JSON")
    args = parser.parse_args()

    source = Path(args.input_path)
    target = Path(args.output_path)

    with source.open("r", encoding="utf-8") as fh:
        legacy_payload = json.load(fh)

    migrated = migrate(legacy_payload)

    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("w", encoding="utf-8") as fh:
        json.dump(migrated, fh, indent=2)


if __name__ == "__main__":
    main()
