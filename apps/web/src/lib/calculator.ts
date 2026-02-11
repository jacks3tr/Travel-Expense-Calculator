import { BudgetResult, EventBreakdown, EventInput, Rates } from "./types";

export const defaultRates: Rates = {
  avg_flight: 1000,
  car_daily: 60,
  hotel_nightly: 250,
  hourly_comm: 150,
  food_daily: 100,
  seasonal_var_pct: 10
};

export const defaultEvent = (): EventInput => ({
  name: "",
  trips: 1,
  days: 1,
  people: 1,
  cars: 1,
  hours: 16
});

export function calculateEvent(rates: Rates, event: EventInput): EventBreakdown {
  const seasonalVar = rates.seasonal_var_pct / 100;
  const flight = rates.avg_flight * event.people * event.trips;
  const car = rates.car_daily * event.days * event.cars;
  const hotel = rates.hotel_nightly * event.people * event.days;
  const food = rates.food_daily * event.people * event.days;
  const labor = rates.hourly_comm * event.hours * event.people;
  const other = flight + car + hotel + food;
  const variance = other * seasonalVar;
  return {
    name: event.name,
    flight,
    car,
    hotel,
    food,
    labor,
    variance,
    total: other + variance + labor
  };
}

function valid(event: EventInput): boolean {
  return (
    event.name.trim().length > 0 &&
    event.people >= 1 &&
    event.trips >= 0 &&
    event.days >= 0 &&
    event.cars >= 0 &&
    event.hours >= 0
  );
}

export function calculateBudget(rates: Rates, events: EventInput[]): BudgetResult {
  const validEvents: EventBreakdown[] = [];
  const invalidRows: string[] = [];

  for (const event of events) {
    if (!valid(event)) {
      if (event.name.trim()) {
        invalidRows.push(event.name.trim());
      }
      continue;
    }
    validEvents.push(calculateEvent(rates, event));
  }

  const totals = validEvents.reduce(
    (acc, item) => {
      acc.flight += item.flight;
      acc.car += item.car;
      acc.hotel += item.hotel;
      acc.food += item.food;
      acc.labor += item.labor;
      acc.variance += item.variance;
      acc.grand_total += item.total;
      return acc;
    },
    {
      flight: 0,
      car: 0,
      hotel: 0,
      food: 0,
      labor: 0,
      variance: 0,
      grand_total: 0
    }
  );

  return { events: validEvents, totals, invalidRows };
}

export const toCurrency = (value: number) => `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
