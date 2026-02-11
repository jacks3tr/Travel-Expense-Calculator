use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error, PartialEq)]
pub enum CalcError {
    #[error("{0} must be non-negative")]
    NegativeValue(&'static str),
    #[error("people must be at least 1")]
    InvalidPeople,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Rates {
    pub avg_flight: f64,
    pub car_daily: f64,
    pub hotel_nightly: f64,
    pub hourly_comm: f64,
    pub food_daily: f64,
    pub seasonal_var_pct: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EventInput {
    pub name: String,
    pub trips: f64,
    pub days: f64,
    pub people: f64,
    pub cars: f64,
    pub hours: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EventBreakdown {
    pub name: String,
    pub flight: f64,
    pub car: f64,
    pub hotel: f64,
    pub food: f64,
    pub labor: f64,
    pub variance: f64,
    pub total: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Totals {
    pub flight: f64,
    pub car: f64,
    pub hotel: f64,
    pub food: f64,
    pub labor: f64,
    pub variance: f64,
    pub grand_total: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct BudgetResult {
    pub events: Vec<EventBreakdown>,
    pub totals: Totals,
}

fn validate_rate(value: f64, name: &'static str) -> Result<(), CalcError> {
    if value < 0.0 {
        return Err(CalcError::NegativeValue(name));
    }
    Ok(())
}

fn validate_event(input: &EventInput) -> Result<(), CalcError> {
    if input.people < 1.0 {
        return Err(CalcError::InvalidPeople);
    }
    if input.trips < 0.0 {
        return Err(CalcError::NegativeValue("trips"));
    }
    if input.days < 0.0 {
        return Err(CalcError::NegativeValue("days"));
    }
    if input.cars < 0.0 {
        return Err(CalcError::NegativeValue("cars"));
    }
    if input.hours < 0.0 {
        return Err(CalcError::NegativeValue("hours"));
    }
    Ok(())
}

pub fn calculate_event_breakdown(rates: &Rates, input: &EventInput) -> Result<EventBreakdown, CalcError> {
    validate_rate(rates.avg_flight, "avg_flight")?;
    validate_rate(rates.car_daily, "car_daily")?;
    validate_rate(rates.hotel_nightly, "hotel_nightly")?;
    validate_rate(rates.hourly_comm, "hourly_comm")?;
    validate_rate(rates.food_daily, "food_daily")?;
    validate_rate(rates.seasonal_var_pct, "seasonal_var_pct")?;
    validate_event(input)?;

    let seasonal_var = rates.seasonal_var_pct / 100.0;
    let flight = rates.avg_flight * input.people * input.trips;
    let car = rates.car_daily * input.days * input.cars;
    let hotel = rates.hotel_nightly * input.people * input.days;
    let food = rates.food_daily * input.people * input.days;
    let labor = rates.hourly_comm * input.hours * input.people;

    let other_expenses = flight + car + hotel + food;
    let variance = other_expenses * seasonal_var;
    let total = other_expenses + variance + labor;

    Ok(EventBreakdown {
        name: input.name.clone(),
        flight,
        car,
        hotel,
        food,
        labor,
        variance,
        total,
    })
}

pub fn calculate_budget(rates: &Rates, events: &[EventInput]) -> BudgetResult {
    let mut breakdowns = Vec::new();
    let mut totals = Totals {
        flight: 0.0,
        car: 0.0,
        hotel: 0.0,
        food: 0.0,
        labor: 0.0,
        variance: 0.0,
        grand_total: 0.0,
    };

    for event in events {
        if let Ok(item) = calculate_event_breakdown(rates, event) {
            totals.flight += item.flight;
            totals.car += item.car;
            totals.hotel += item.hotel;
            totals.food += item.food;
            totals.labor += item.labor;
            totals.variance += item.variance;
            totals.grand_total += item.total;
            breakdowns.push(item);
        }
    }

    BudgetResult {
        events: breakdowns,
        totals,
    }
}
