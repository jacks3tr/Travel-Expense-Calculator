import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { BudgetResult } from "../../lib/types";

const COLORS = ["#0b7285", "#2f9e44", "#c92a2a", "#f08c00", "#5f3dc4", "#364fc7"];

export function ExpenseCharts({ result }: { result: BudgetResult }) {
  const categoryData = [
    { name: "Flight", value: result.totals.flight },
    { name: "Car", value: result.totals.car },
    { name: "Hotel", value: result.totals.hotel },
    { name: "Food", value: result.totals.food },
    { name: "Labor", value: result.totals.labor },
    { name: "Variance", value: result.totals.variance }
  ];

  const eventData = result.events.map((event) => ({ name: event.name, total: event.total }));

  const exportPng = async () => {
    const svg = document.querySelector(".recharts-wrapper svg");
    if (!svg) {
      return;
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

    const canvas = document.createElement("canvas");
    canvas.width = img.width || 900;
    canvas.height = img.height || 360;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(url);
      return;
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    const pngUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = pngUrl;
    a.download = "travel-estimator-chart.png";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card">
      <h3>Visual Breakdown</h3>
      <button className="secondary" onClick={exportPng}>Export PNG</button>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, minHeight: 280 }}>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={90}>
              {categoryData.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={eventData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total" fill="#0b7285" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
