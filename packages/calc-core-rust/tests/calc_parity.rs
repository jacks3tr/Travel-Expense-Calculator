use calc_core_rust::{calculate_budget, calculate_event_breakdown, CalcError, EventInput, Rates};

fn sample_rates() -> Rates {
    Rates {
        avg_flight: 1000.0,
        car_daily: 60.0,
        hotel_nightly: 250.0,
        hourly_comm: 150.0,
        food_daily: 100.0,
        seasonal_var_pct: 10.0,
    }
}

#[test]
fn parity_single_event_matches_legacy_formula() {
    let rates = sample_rates();
    let event = EventInput {
        name: "Kickoff".to_string(),
        trips: 1.0,
        days: 2.0,
        people: 3.0,
        cars: 1.0,
        hours: 16.0,
    };

    let breakdown = calculate_event_breakdown(&rates, &event).expect("valid event");
    assert_eq!(breakdown.flight, 3000.0);
    assert_eq!(breakdown.car, 120.0);
    assert_eq!(breakdown.hotel, 1500.0);
    assert_eq!(breakdown.food, 600.0);
    assert_eq!(breakdown.labor, 7200.0);
    assert_eq!(breakdown.variance, 522.0);
    assert_eq!(breakdown.total, 12942.0);
}

#[test]
fn invalid_values_are_rejected() {
    let rates = sample_rates();
    let event = EventInput {
        name: "Bad".to_string(),
        trips: 1.0,
        days: 1.0,
        people: 0.0,
        cars: 1.0,
        hours: 8.0,
    };

    let err = calculate_event_breakdown(&rates, &event).expect_err("invalid people");
    assert_eq!(err, CalcError::InvalidPeople);
}

#[test]
fn aggregation_handles_zero_and_large_values() {
    let rates = sample_rates();
    let events = vec![
        EventInput {
            name: "Zero".to_string(),
            trips: 0.0,
            days: 0.0,
            people: 1.0,
            cars: 0.0,
            hours: 0.0,
        },
        EventInput {
            name: "Large".to_string(),
            trips: 5.0,
            days: 10.0,
            people: 20.0,
            cars: 8.0,
            hours: 30.0,
        },
    ];

    let out = calculate_budget(&rates, &events);
    assert_eq!(out.events.len(), 2);
    assert!(out.totals.grand_total > 0.0);
    assert!(out.totals.flight > 0.0);
}
