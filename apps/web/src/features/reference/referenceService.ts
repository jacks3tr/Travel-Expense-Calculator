export type ReferenceRequest = {
  origin: string;
  destination: string;
};

export type ReferenceResult = {
  airfare: string;
  airfare_source: string;
  car: string;
  car_source: string;
  hotel: string;
  hotel_source: string;
  travel_time: string;
  travel_time_source: string;
};

function unavailable(source: string): ReferenceResult {
  return {
    airfare: "Unavailable",
    airfare_source: source,
    car: "Unavailable",
    car_source: source,
    hotel: "Unavailable",
    hotel_source: source,
    travel_time: "Unavailable",
    travel_time_source: source
  };
}

async function loadCsvFallback(): Promise<Record<string, ReferenceResult>> {
  const response = await fetch("/reference-data/mock-reference.csv");
  const csv = await response.text();
  const rows = csv.split("\n").slice(1).filter(Boolean);
  const map: Record<string, ReferenceResult> = {};
  for (const row of rows) {
    const [
      from,
      to,
      airfare,
      airfare_source,
      car,
      car_source,
      hotel,
      hotel_source,
      travel_time,
      travel_time_source
    ] = row.split(",");
    const key = `${(from || "").trim().toLowerCase()}|${(to || "").trim().toLowerCase()}`;
    map[key] = {
      airfare: airfare || "Unavailable",
      airfare_source: airfare_source || "Unavailable",
      car: car || "Unavailable",
      car_source: car_source || "Unavailable",
      hotel: hotel || "Unavailable",
      hotel_source: hotel_source || "Unavailable",
      travel_time: travel_time || "Unavailable",
      travel_time_source: travel_time_source || "Unavailable"
    };
  }
  return map;
}

export async function getReferenceEstimate(request: ReferenceRequest): Promise<ReferenceResult> {
  try {
    const fallback = await loadCsvFallback();
    const key = `${request.origin.trim().toLowerCase()}|${request.destination.trim().toLowerCase()}`;
    return fallback[key] ?? unavailable("No sourced route match as of 2026-02-11");
  } catch {
    return unavailable("Reference data file unavailable as of 2026-02-11");
  }
}
