// Pure financial helpers (no React) — reused later in React Native

// Parse a "YYYY-MM-DD" string as a LOCAL date (no UTC shift).
export const parseLocalDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  const parts = String(dateStr).slice(0, 10).split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
};

// Format a Date as YYYY-MM-DD using LOCAL time (no UTC shift).
export const toLocalISODate = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const todayISO = () => toLocalISODate(new Date());

export const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// Global privacy mode (synced via PrivacyProvider in src/lib/privacy-context.tsx).
// When enabled, monetary formatters mask the value.
let _privacyMode = false;
export const setPrivacyMode = (v: boolean) => {
  _privacyMode = v;
};
export const isPrivacyMode = () => _privacyMode;
export const PRIVATE_MASK = "•••••";

export const fmtMoney = (n: number | null | undefined) =>
  _privacyMode ? `R$ ${PRIVATE_MASK}` : BRL.format(Number(n ?? 0));

export const fmtNumber = (n: number | null | undefined, digits = 2) =>
  _privacyMode
    ? PRIVATE_MASK
    : Number(n ?? 0).toLocaleString("pt-BR", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });

export const fmtPct = (n: number) =>
  `${n >= 0 ? "↑" : "↓"} ${Math.abs(n).toFixed(1)}%`;

export const monthRange = (date = new Date()) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: toLocalISODate(start), end: toLocalISODate(end) };
};

export const monthLabel = (date = new Date()) =>
  date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

export const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

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
  return Array.from({ length: count }, (_, i) => toLocalISODate(new Date(y, m - 1 + i, d)));
};

// Compute days until a date (negative = overdue). Safe against null/invalid.
export const daysUntil = (dateStr: string | null | undefined) => {
  if (!dateStr) return Number.POSITIVE_INFINITY;
  const parts = String(dateStr).slice(0, 10).split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return Number.POSITIVE_INFINITY;
  const [y, m, d] = parts;
  const target = new Date(y, m - 1, d);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
};

export type DueUrgency = "overdue" | "today" | "soon" | "upcoming" | "future";

export const dueUrgency = (dateStr: string | null | undefined): DueUrgency => {
  if (!dateStr) return "future";
  const d = daysUntil(dateStr);
  if (!Number.isFinite(d)) return "future";
  if (d < 0) return "overdue";
  if (d === 0) return "today";
  if (d <= 3) return "soon";
  if (d <= 7) return "upcoming";
  return "future";
};

// Safe locale date formatter for "YYYY-MM-DD" or ISO strings.
export const fmtDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "—";
  const parts = String(dateStr).slice(0, 10).split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return "—";
  const [y, m, d] = parts;
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR");
};

// Human-friendly elapsed time since a date (pt-BR).
// < 1 mês  → "Há X dias"
// < 1 ano  → "Há X meses"
// >= 1 ano → "Há X anos" ou "Há X anos e Y meses"
export const fmtElapsedSince = (dateStr: string | null | undefined): string | null => {
  if (!dateStr) return null;
  const parts = String(dateStr).slice(0, 10).split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, d] = parts;
  const start = new Date(y, m - 1, d);
  const now = new Date();
  if (start > now) return null;

  const msDay = 1000 * 60 * 60 * 24;
  const days = Math.floor((now.getTime() - start.getTime()) / msDay);
  if (days < 1) return "Hoje";

  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;

  if (months < 1) return `Há ${days} dia${days === 1 ? "" : "s"}`;
  if (months < 12) return `Há ${months} ${months === 1 ? "mês" : "meses"}`;

  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (remMonths === 0) return `Há ${years} ano${years === 1 ? "" : "s"}`;
  return `Há ${years} ano${years === 1 ? "" : "s"} e ${remMonths} ${remMonths === 1 ? "mês" : "meses"}`;
};

