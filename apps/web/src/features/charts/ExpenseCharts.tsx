import { useRef } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import { BudgetResult } from "../../lib/types";
import { toCurrency } from "../../lib/calculator";

const COLORS = ["#0b7285", "#2f9e44", "#c92a2a", "#f08c00", "#5f3dc4", "#364fc7"];
const MIN_PIE_LABEL_PERCENT = 0.08;

export function ExpenseCharts({ result }: { result: BudgetResult }) {
  const chartsGridRef = useRef<HTMLDivElement>(null);
  const categoryData = [
    { name: "Flight", value: result.totals.flight },
    { name: "Car", value: result.totals.car },
    { name: "Hotel", value: result.totals.hotel },
    { name: "Food", value: result.totals.food },
    { name: "Labor", value: result.totals.labor },
    { name: "Variance", value: result.totals.variance }
  ];

  const eventData = result.events.map((event) => ({ name: event.name, total: event.total }));
  const categoryTotal = categoryData.reduce((sum, item) => sum + item.value, 0);

  const formatCompactCurrency = (value: number) => {
    if (!Number.isFinite(value)) return "$0";
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${Math.round(value)}`;
  };

  const pieLegendItems = categoryData.map((item, index) => ({
    color: COLORS[index % COLORS.length],
    label: `${item.name}: ${toCurrency(item.value)} (${categoryTotal > 0 ? ((item.value / categoryTotal) * 100).toFixed(1) : "0.0"}%)`
  }));

  const renderPieLabel = ({ value, percent }: { value?: number; percent?: number }) => {
    const ratio = Number(percent) || 0;
    if (ratio < MIN_PIE_LABEL_PERCENT) {
      return "";
    }
    return `${formatCompactCurrency(Number(value) || 0)} (${(ratio * 100).toFixed(1)}%)`;
  };

  const exportPng = async () => {
    const chartsGrid = chartsGridRef.current;
    if (!chartsGrid) {
      return;
    }

    const wrappers = Array.from(chartsGrid.querySelectorAll<HTMLElement>(".recharts-wrapper"));
    const panels = Array.from(chartsGrid.querySelectorAll<HTMLElement>(".chart-panel"));
    if (wrappers.length === 0 || panels.length < 2) {
      return;
    }

    const gridRect = (chartsGrid as HTMLElement).getBoundingClientRect();
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(gridRect.width * scale));
    canvas.height = Math.max(1, Math.round(gridRect.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.scale(scale, scale);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, gridRect.width, gridRect.height);

    const images = await Promise.all(
      wrappers.map(async (wrapper) => {
        const svg = wrapper.querySelector("svg");
        if (!svg) {
          return null;
        }

        const data = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.src = url;

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Chart image load failed"));
        });

        return { img, url, rect: wrapper.getBoundingClientRect() };
      })
    );

    images.forEach((item) => {
      if (!item) {
        return;
      }
      const x = item.rect.left - gridRect.left;
      const y = item.rect.top - gridRect.top;
      const w = item.rect.width;
      const h = item.rect.height;
      ctx.drawImage(item.img, x, y, w, h);
      URL.revokeObjectURL(item.url);
    });

    const piePanelRect = panels[0].getBoundingClientRect();
    const pieLegendStartX = piePanelRect.left - gridRect.left + 8;
    let pieLegendY = piePanelRect.top - gridRect.top + 266;
    ctx.font = "12px Segoe UI";
    pieLegendItems.forEach((item) => {
      ctx.fillStyle = item.color;
      ctx.fillRect(pieLegendStartX, pieLegendY - 9, 10, 10);
      ctx.fillStyle = "#102a43";
      ctx.fillText(item.label, pieLegendStartX + 16, pieLegendY);
      pieLegendY += 16;
    });

    const barPanelRect = panels[1].getBoundingClientRect();
    const barLegendX = barPanelRect.left - gridRect.left + 8;
    const barLegendY = barPanelRect.top - gridRect.top + 266;
    ctx.fillStyle = "#0b7285";
    ctx.fillRect(barLegendX, barLegendY - 9, 10, 10);
    ctx.fillStyle = "#102a43";
    ctx.fillText("Event Total: values shown in $", barLegendX + 16, barLegendY);

    const pngUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = pngUrl;
    a.download = "travel-estimator-chart.png";
    a.click();
  };

  return (
    <div className="card">
      <h3>Visual Breakdown</h3>
      <button className="secondary" onClick={exportPng}>Export PNG</button>
      <div className="charts-grid" style={{ minHeight: 280 }} ref={chartsGridRef}>
        <div className="chart-panel">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart margin={{ top: 12, right: 16, bottom: 16, left: 16 }}>
              <Pie
                data={categoryData}
                dataKey="value"
                nameKey="name"
                outerRadius={86}
                label={renderPieLabel}
                labelLine
                paddingAngle={1}
              >
                {categoryData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => toCurrency(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="chart-legend-list">
            {pieLegendItems.map((item) => (
              <li key={item.label}>
                <span className="chart-legend-swatch" style={{ background: item.color }} />
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="chart-panel">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={eventData} margin={{ top: 16, right: 16, bottom: 28, left: 52 }}>
              <XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={44} />
              <YAxis tickFormatter={(value) => formatCompactCurrency(Number(value))} width={70} />
              <Tooltip formatter={(value) => toCurrency(Number(value))} />
              <Bar dataKey="total" name="Event Total" fill="#0b7285">
                <LabelList dataKey="total" position="top" formatter={(value: number) => formatCompactCurrency(Number(value))} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <ul className="chart-legend-list">
            <li>
              <span className="chart-legend-swatch" style={{ background: "#0b7285" }} />
              <span>Event Total (USD)</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
