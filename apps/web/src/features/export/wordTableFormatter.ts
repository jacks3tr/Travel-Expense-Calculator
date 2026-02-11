import { BudgetResult } from "../../lib/types";
import { toCurrency } from "../../lib/calculator";

const headers = ["Event", "Flight", "Car", "Hotel", "Food", "Labor", "Variance", "Total"];

export function formatWordTable(result: BudgetResult): string {
  const rows = [headers.join("\t")];

  for (const event of result.events) {
    rows.push(
      [
        event.name,
        toCurrency(event.flight),
        toCurrency(event.car),
        toCurrency(event.hotel),
        toCurrency(event.food),
        toCurrency(event.labor),
        toCurrency(event.variance),
        toCurrency(event.total)
      ].join("\t")
    );
  }

  rows.push(
    [
      "Totals",
      toCurrency(result.totals.flight),
      toCurrency(result.totals.car),
      toCurrency(result.totals.hotel),
      toCurrency(result.totals.food),
      toCurrency(result.totals.labor),
      toCurrency(result.totals.variance),
      toCurrency(result.totals.grand_total)
    ].join("\t")
  );

  return rows.join("\n");
}
