use calc_core_rust::{calculate_budget, calculate_event_breakdown, EventInput, Rates};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn calculate_budget_json(rates_json: &str, events_json: &str) -> Result<String, JsValue> {
    let rates: Rates = serde_json::from_str(rates_json)
        .map_err(|e| JsValue::from_str(&format!("invalid rates payload: {e}")))?;
    let events: Vec<EventInput> = serde_json::from_str(events_json)
        .map_err(|e| JsValue::from_str(&format!("invalid events payload: {e}")))?;

    let result = calculate_budget(&rates, &events);
    serde_json::to_string(&result).map_err(|e| JsValue::from_str(&format!("serialization failed: {e}")))
}

#[wasm_bindgen]
pub fn calculate_event_breakdown_json(rates_json: &str, event_json: &str) -> Result<String, JsValue> {
    let rates: Rates = serde_json::from_str(rates_json)
        .map_err(|e| JsValue::from_str(&format!("invalid rates payload: {e}")))?;
    let event: EventInput = serde_json::from_str(event_json)
        .map_err(|e| JsValue::from_str(&format!("invalid event payload: {e}")))?;

    let result = calculate_event_breakdown(&rates, &event)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    serde_json::to_string(&result).map_err(|e| JsValue::from_str(&format!("serialization failed: {e}")))
}
