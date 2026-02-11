export type Rates = {
  avg_flight: number;
  car_daily: number;
  hotel_nightly: number;
  hourly_comm: number;
  food_daily: number;
  seasonal_var_pct: number;
};

export type EventInput = {
  name: string;
  trips: number;
  days: number;
  people: number;
  cars: number;
  hours: number;
};

export type EventBreakdown = {
  name: string;
  flight: number;
  car: number;
  hotel: number;
  food: number;
  labor: number;
  variance: number;
  total: number;
};

export type Totals = Omit<EventBreakdown, "name" | "total"> & { grand_total: number };

export type BudgetResult = {
  events: EventBreakdown[];
  totals: Totals;
  invalidRows: string[];
};
