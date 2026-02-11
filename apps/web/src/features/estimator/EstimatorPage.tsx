import { useEffect, useMemo, useState } from "react";
import { calculateBudget, defaultEvent, defaultRates, toCurrency } from "../../lib/calculator";
import { EventInput, Rates } from "../../lib/types";
import { formatWordTable } from "../export/wordTableFormatter";
import { getReferenceEstimate, ReferenceResult } from "../reference/referenceService";
import { ExpenseCharts } from "../charts/ExpenseCharts";
import { UpdateBanner } from "../update/UpdateBanner";

export function EstimatorPage() {
  const [rates, setRates] = useState<Rates>(defaultRates);
  const [events, setEvents] = useState<EventInput[]>([defaultEvent()]);
  const [reference, setReference] = useState<ReferenceResult | null>(null);
  const [destination, setDestination] = useState("Denver");
  const [releaseUrl, setReleaseUrl] = useState<string | null>(null);

  const result = useMemo(() => calculateBudget(rates, events), [rates, events]);

  const updateEvent = (index: number, key: keyof EventInput, value: string) => {
    setEvents((prev) =>
      prev.map((event, i) => {
        if (i !== index) return event;
        if (key === "name") return { ...event, [key]: value };
        return { ...event, [key]: Number(value) };
      })
    );
  };

  const addEvent = () => setEvents((prev) => [...prev, defaultEvent()]);

  const copyWordOutput = async () => {
    await navigator.clipboard.writeText(formatWordTable(result));
  };

  const runReferenceLookup = async () => {
    const data = await getReferenceEstimate({ destination });
    setReference(data);
  };

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
      <h1>Travel Estimator</h1>
      {releaseUrl && <UpdateBanner releaseUrl={releaseUrl} />}

      <section className="card">
        <h2>Rates</h2>
        <div className="grid">
          {Object.entries(rates).map(([key, value]) => (
            <label key={key}>
              {key}
              <input
                value={value}
                type="number"
                onChange={(e) => setRates((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Events</h2>
        {events.map((event, index) => (
          <div className="grid" key={index} style={{ marginBottom: 8 }}>
            <label>
              name
              <input value={event.name} onChange={(e) => updateEvent(index, "name", e.target.value)} />
            </label>
            <label>
              trips
              <input type="number" value={event.trips} onChange={(e) => updateEvent(index, "trips", e.target.value)} />
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
        <button className="secondary" onClick={addEvent}>Add event</button>
      </section>

      <section className="card">
        <h2>Summary</h2>
        {result.invalidRows.length > 0 && <p className="error">Invalid rows skipped: {result.invalidRows.join(", ")}</p>}
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
            {result.events.map((event) => (
              <tr key={event.name + event.total}>
                <td>{event.name}</td>
                <td>{toCurrency(event.flight)}</td>
                <td>{toCurrency(event.car)}</td>
                <td>{toCurrency(event.hotel)}</td>
                <td>{toCurrency(event.food)}</td>
                <td>{toCurrency(event.labor)}</td>
                <td>{toCurrency(event.variance)}</td>
                <td>{toCurrency(event.total)}</td>
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
        <button onClick={copyWordOutput}>Copy Word Output</button>
      </section>

      <section className="card">
        <h2>Reference Check (advisory only)</h2>
        <div className="grid" style={{ alignItems: "end" }}>
          <label>
            destination
            <input value={destination} onChange={(e) => setDestination(e.target.value)} />
          </label>
          <button className="secondary" onClick={runReferenceLookup}>Lookup</button>
        </div>
        {reference && (
          <table className="table" style={{ marginTop: 12 }}>
            <tbody>
              <tr><td>Provider</td><td>{reference.provider}</td></tr>
              <tr><td>Airfare</td><td>{reference.airfare}</td></tr>
              <tr><td>Car</td><td>{reference.car}</td></tr>
              <tr><td>Hotel</td><td>{reference.hotel}</td></tr>
              <tr><td>Travel time</td><td>{reference.travel_time}</td></tr>
            </tbody>
          </table>
        )}
      </section>

      {result.events.length > 0 && <ExpenseCharts result={result} />}
    </div>
  );
}
