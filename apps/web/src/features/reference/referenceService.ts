export type ReferenceRequest = {
  origin?: string;
  destination: string;
};

export type ReferenceResult = {
  airfare: string;
  car: string;
  hotel: string;
  travel_time: string;
  provider: string;
};

async function loadCsvFallback(): Promise<Record<string, ReferenceResult>> {
  const response = await fetch("/reference-data/mock-reference.csv");
  const csv = await response.text();
  const rows = csv.split("\n").slice(1).filter(Boolean);
  const map: Record<string, ReferenceResult> = {};
  for (const row of rows) {
    const [city, airfare, car, hotel, travel_time] = row.split(",");
    map[city.toLowerCase()] = {
      airfare,
      car,
      hotel,
      travel_time,
      provider: "csv-fallback"
    };
  }
  return map;
}

export async function getReferenceEstimate(request: ReferenceRequest): Promise<ReferenceResult> {
  try {
    const fallback = await loadCsvFallback();
    return (
      fallback[request.destination.toLowerCase()] ?? {
        airfare: "$850",
        car: "$75/day",
        hotel: "$225/night",
        travel_time: "2h each way",
        provider: "default-fallback"
      }
    );
  } catch {
    return {
      airfare: "Unavailable",
      car: "Unavailable",
      hotel: "Unavailable",
      travel_time: "Unavailable",
      provider: "offline"
    };
  }
}
