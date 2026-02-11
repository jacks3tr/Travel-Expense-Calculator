import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { calculateBudget, defaultEvent, defaultRates, toCurrency } from "../../lib/calculator";
import { EventInput, Rates } from "../../lib/types";
import { formatWordTable } from "../export/wordTableFormatter";
import { getReferenceEstimate, ReferenceResult } from "../reference/referenceService";
import { ExpenseCharts } from "../charts/ExpenseCharts";
import { UpdateBanner } from "../update/UpdateBanner";

type TabView = "summary" | "details";
type ThemeMode = "light" | "dark";

const EVENT_COLUMNS: Array<keyof EventInput> = ["name", "trips", "days", "people", "cars", "hours"];
const RATE_LABELS: Record<keyof Rates, string> = {
  avg_flight: "Average Flight Cost",
  car_daily: "Car Rental Daily",
  hotel_nightly: "Hotel Room Nightly",
  hourly_comm: "Hourly Commute ($/hr)",
  food_daily: "Food per Day",
  seasonal_var_pct: "Seasonal Variance (%)"
};

export function EstimatorPage() {
  const [rates, setRates] = useState<Rates>(defaultRates);
  const [events, setEvents] = useState<EventInput[]>([defaultEvent()]);
  const [selectedRows, setSelectedRows] = useState<Record<number, boolean>>({});
  const [reference, setReference] = useState<ReferenceResult | null>(null);
  const [origin, setOrigin] = useState("RDU");
  const [destination, setDestination] = useState("DEN");
  const [releaseUrl, setReleaseUrl] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [activeTab, setActiveTab] = useState<TabView>("summary");
  const [ratesVisible, setRatesVisible] = useState(true);
  const [copyEventsLabel, setCopyEventsLabel] = useState("Copy Events");
  const [copySummaryLabel, setCopySummaryLabel] = useState("Copy Summary");
  const [copyDetailsLabel, setCopyDetailsLabel] = useState("Copy Details");
  const showReferencePanel = false;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const invalidSignatureRef = useRef("");

  const result = useMemo(() => calculateBudget(rates, events), [rates, events]);
  const summaryText = useMemo(() => {
    const travelExpenses = result.totals.flight + result.totals.car + result.totals.hotel + result.totals.food;
    return [
      `Travel time cost:\t${toCurrency(result.totals.labor)}`,
      `Travel expenses:\t${toCurrency(travelExpenses)}`,
      `Seasonal variance:\t${toCurrency(result.totals.variance)}`,
      "----------------------------------------",
      `Total budget all:\t${toCurrency(result.totals.grand_total)}`
    ].join("\n");
  }, [result]);
  const travelExpenses = result.totals.flight + result.totals.car + result.totals.hotel + result.totals.food;

  const updateEvent = (index: number, key: keyof EventInput, value: string) => {
    setEvents((prev) =>
      prev.map((event, i) => {
        if (i !== index) return event;
        if (key === "name") return { ...event, [key]: value };
        return { ...event, [key]: Number(value || 0) };
      })
    );
  };

  const addEvent = () => setEvents((prev) => [...prev, defaultEvent()]);

  const toggleRowSelection = (index: number) => {
    setSelectedRows((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const deleteSelected = () => {
    const next = events.filter((_, index) => !selectedRows[index]);
    setEvents(next.length > 0 ? next : [defaultEvent()]);
    setSelectedRows({});
  };

  const copyEvents = async () => {
    const headers = EVENT_COLUMNS.join("\t");
    const rows = events
      .filter((event) => event.name.trim().length > 0)
      .map((event) => EVENT_COLUMNS.map((column) => String(event[column])).join("\t"));
    await navigator.clipboard.writeText([headers, ...rows].join("\n"));
    setCopyEventsLabel("Copied!");
    setTimeout(() => setCopyEventsLabel("Copy Events"), 2000);
  };

  const copyDetails = async () => {
    await navigator.clipboard.writeText(formatWordTable(result));
    setCopyDetailsLabel("Copied!");
    setTimeout(() => setCopyDetailsLabel("Copy Details"), 2000);
  };

  const copySummary = async () => {
    await navigator.clipboard.writeText(summaryText);
    setCopySummaryLabel("Copied!");
    setTimeout(() => setCopySummaryLabel("Copy Summary"), 2000);
  };

  const runReferenceLookup = async () => {
    const data = await getReferenceEstimate({ origin, destination });
    setReference(data);
  };

  const exportJson = () => {
    const payload = {
      rates: {
        ...rates,
        seasonal_var: rates.seasonal_var_pct
      },
      events
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "travel-estimator.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const raw = await file.text();
    const parsed = JSON.parse(raw) as {
      rates?: Partial<Rates> & { seasonal_var?: number };
      events?: Array<Partial<EventInput>>;
    };

    const nextRates = parsed.rates
      ? {
          avg_flight: Number(parsed.rates.avg_flight ?? defaultRates.avg_flight),
          car_daily: Number(parsed.rates.car_daily ?? defaultRates.car_daily),
          hotel_nightly: Number(parsed.rates.hotel_nightly ?? defaultRates.hotel_nightly),
          hourly_comm: Number(parsed.rates.hourly_comm ?? defaultRates.hourly_comm),
          food_daily: Number(parsed.rates.food_daily ?? defaultRates.food_daily),
          seasonal_var_pct: Number(parsed.rates.seasonal_var_pct ?? parsed.rates.seasonal_var ?? defaultRates.seasonal_var_pct)
        }
      : defaultRates;

    const nextEvents =
      parsed.events?.map((item) => ({
        name: String(item.name ?? ""),
        trips: Number(item.trips ?? 1),
        days: Number(item.days ?? 1),
        people: Number(item.people ?? 1),
        cars: Number(item.cars ?? 1),
        hours: Number(item.hours ?? 16)
      })) ?? [defaultEvent()];

    setRates(nextRates);
    setEvents(nextEvents.length > 0 ? nextEvents : [defaultEvent()]);
    setSelectedRows({});
    event.target.value = "";
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const handleShortcuts = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "s") {
        event.preventDefault();
        exportJson();
      }
      if (key === "o") {
        event.preventDefault();
        fileInputRef.current?.click();
      }
    };

    window.addEventListener("keydown", handleShortcuts);
    return () => window.removeEventListener("keydown", handleShortcuts);
  }, [rates, events]);

  useEffect(() => {
    if (result.invalidRows.length === 0) {
      invalidSignatureRef.current = "";
      return;
    }

    const signature = result.invalidRows.join("|");
    if (signature === invalidSignatureRef.current) {
      return;
    }

    invalidSignatureRef.current = signature;
    window.alert(`Validation warning: invalid rows were skipped.\n\n${result.invalidRows.join(", ")}`);
  }, [result.invalidRows]);

  useEffect(() => {
    const tauriInvoke = (window as { __TAURI__?: { core?: { invoke?: (cmd: string) => Promise<string | null> } } }).__TAURI__?.core?.invoke;
    if (!tauriInvoke) {
      return;
    }

    tauriInvoke("check_update")
      .then((url) => {
        if (url) {
          setReleaseUrl(url);
        }
      })
      .catch(() => {
        setReleaseUrl(null);
      });
  }, []);

  return (
    <div className="container">
      <div className="toolbar-row">
        <h1>Travel Estimator</h1>
        <div className="actions-inline">
          <button className="secondary" onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}>
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </button>
          <button className="secondary" onClick={exportJson}>Export JSON</button>
          <button className="secondary" onClick={() => fileInputRef.current?.click()}>Import JSON</button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={importJson} style={{ display: "none" }} />
        </div>
      </div>
      {releaseUrl && <UpdateBanner releaseUrl={releaseUrl} />}

      <section className="card">
        <div className="toolbar-row" style={{ marginBottom: ratesVisible ? 12 : 0 }}>
          <h2 style={{ margin: 0 }}>Rates</h2>
          <button className="secondary" onClick={() => setRatesVisible((prev) => !prev)}>
            {ratesVisible ? "Hide Rates" : "Show Rates"}
          </button>
        </div>
        {ratesVisible && (
          <div className="grid">
            {(Object.entries(rates) as Array<[keyof Rates, number]>).map(([key, value]) => (
              <label key={key}>
                {RATE_LABELS[key]}
                <input
                  value={value}
                  type="number"
                  onChange={(e) => setRates((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                />
              </label>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Events</h2>
        <div className="toolbar-row" style={{ marginBottom: 12 }}>
          <div className="actions-inline">
            <button className="secondary" onClick={addEvent}>Add Row</button>
            <button className="secondary" onClick={deleteSelected}>Delete Selected</button>
          </div>
          <div className="actions-inline">
            <button className="secondary" onClick={copyEvents}>{copyEventsLabel}</button>
          </div>
        </div>
        {events.map((event, index) => (
          <div className="event-row" key={index}>
            <label className="checkbox-label">
              Select
              <input type="checkbox" checked={!!selectedRows[index]} onChange={() => toggleRowSelection(index)} />
            </label>
            <label>
              name
              <input value={event.name} onChange={(e) => updateEvent(index, "name", e.target.value)} />
            </label>
            <label>
              trips
              <input
                type="number"
                title="Trips: rarely changed from 1. Increase only for multiple identical round trips; if trips differ, use separate events."
                value={event.trips}
                onChange={(e) => updateEvent(index, "trips", e.target.value)}
              />
            </label>
            <label>
              days
              <input type="number" value={event.days} onChange={(e) => updateEvent(index, "days", e.target.value)} />
            </label>
            <label>
              people
              <input type="number" value={event.people} onChange={(e) => updateEvent(index, "people", e.target.value)} />
            </label>
            <label>
              cars
              <input type="number" value={event.cars} onChange={(e) => updateEvent(index, "cars", e.target.value)} />
            </label>
            <label>
              hours
              <input type="number" value={event.hours} onChange={(e) => updateEvent(index, "hours", e.target.value)} />
            </label>
          </div>
        ))}
      </section>

      <section className="card">
        <div className="toolbar-row" style={{ marginBottom: 12 }}>
          <div className="actions-inline">
            <button className={activeTab === "summary" ? "" : "secondary"} onClick={() => setActiveTab("summary")}>Summary</button>
            <button className={activeTab === "details" ? "" : "secondary"} onClick={() => setActiveTab("details")}>Details</button>
          </div>
          <div className="actions-inline">
            {activeTab === "summary" && <button onClick={copySummary}>{copySummaryLabel}</button>}
            {activeTab === "details" && <button onClick={copyDetails}>{copyDetailsLabel}</button>}
          </div>
        </div>
        {result.invalidRows.length > 0 && <p className="error">Invalid rows skipped: {result.invalidRows.join(", ")}</p>}
        {activeTab === "summary" && (
          <div className="summary-shell">
            <div className="summary-grid">
              <article className="summary-card">
                <h3>Travel Time Cost</h3>
                <p>{toCurrency(result.totals.labor)}</p>
              </article>
              <article className="summary-card">
                <h3>Travel Expenses</h3>
                <p>{toCurrency(travelExpenses)}</p>
              </article>
              <article className="summary-card">
                <h3>Seasonal Variance</h3>
                <p>{toCurrency(result.totals.variance)}</p>
              </article>
              <article className="summary-card summary-card-total">
                <h3>Total Budget</h3>
                <p>{toCurrency(result.totals.grand_total)}</p>
              </article>
            </div>
            <p className="summary-note">Summary copy output is plain text for quick pasting into emails and notes.</p>
          </div>
        )}
        {activeTab === "details" && (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Flight</th>
                  <th>Car</th>
                  <th>Hotel</th>
                  <th>Food</th>
                  <th>Labor</th>
                  <th>Variance</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {result.events.map((item) => (
                  <tr key={item.name + item.total}>
                    <td>{item.name}</td>
                    <td>{toCurrency(item.flight)}</td>
                    <td>{toCurrency(item.car)}</td>
                    <td>{toCurrency(item.hotel)}</td>
                    <td>{toCurrency(item.food)}</td>
                    <td>{toCurrency(item.labor)}</td>
                    <td>{toCurrency(item.variance)}</td>
                    <td>{toCurrency(item.total)}</td>
                  </tr>
                ))}
                <tr>
                  <td><strong>Totals</strong></td>
                  <td>{toCurrency(result.totals.flight)}</td>
                  <td>{toCurrency(result.totals.car)}</td>
                  <td>{toCurrency(result.totals.hotel)}</td>
                  <td>{toCurrency(result.totals.food)}</td>
                  <td>{toCurrency(result.totals.labor)}</td>
                  <td>{toCurrency(result.totals.variance)}</td>
                  <td>{toCurrency(result.totals.grand_total)}</td>
                </tr>
              </tbody>
            </table>
            <p className="summary-note">Details copy output is a tab-delimited table for spreadsheet/Word paste.</p>
          </>
        )}
      </section>

      {showReferencePanel && (
        <section className="card">
          <h2>Reference Check (advisory only)</h2>
          <div className="grid" style={{ alignItems: "end" }}>
            <label>
              Origin
              <input value={origin} onChange={(e) => setOrigin(e.target.value)} />
            </label>
            <label>
              Destination
              <input value={destination} onChange={(e) => setDestination(e.target.value)} />
            </label>
            <button className="secondary" onClick={runReferenceLookup}>Lookup</button>
          </div>
          {reference && (
            <table className="table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Value</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Airfare</td><td>{reference.airfare}</td><td>{reference.airfare_source}</td></tr>
                <tr><td>Car</td><td>{reference.car}</td><td>{reference.car_source}</td></tr>
                <tr><td>Hotel</td><td>{reference.hotel}</td><td>{reference.hotel_source}</td></tr>
                <tr><td>Travel time</td><td>{reference.travel_time}</td><td>{reference.travel_time_source}</td></tr>
              </tbody>
            </table>
          )}
        </section>
      )}

      {result.events.length > 0 && <ExpenseCharts result={result} />}
    </div>
  );
}
