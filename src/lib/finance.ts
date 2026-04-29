// Pure financial helpers (no React) — reused later in React Native
export const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const fmtMoney = (n: number | null | undefined) =>
  BRL.format(Number(n ?? 0));

export const fmtPct = (n: number) =>
  `${n >= 0 ? "↑" : "↓"} ${Math.abs(n).toFixed(1)}%`;

export const monthRange = (date = new Date()) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
};

export const monthLabel = (date = new Date()) =>
  date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

export type Lot = { quantity: number; unit_price: number; fees?: number };

export const averagePrice = (lots: Lot[]) => {
  const totalQty = lots.reduce((s, l) => s + Number(l.quantity), 0);
  if (totalQty === 0) return { quantity: 0, average: 0, cost: 0 };
  const totalCost = lots.reduce(
    (s, l) => s + Number(l.quantity) * Number(l.unit_price) + Number(l.fees ?? 0),
    0
  );
  return { quantity: totalQty, average: totalCost / totalQty, cost: totalCost };
};

// Generate scheduled installment dates (one per month from first_date)
export const installmentDates = (firstDate: string, count: number) => {
  const [y, m, d] = firstDate.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const dt = new Date(y, m - 1 + i, d);
    return dt.toISOString().slice(0, 10);
  });
};
