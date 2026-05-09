import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useRealtimeQuery } from "@/lib/data-hooks";
import { fmtMoney, fmtDate, MONTH_NAMES, parseLocalDate, installmentDates } from "@/lib/finance";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownRight, ArrowUpRight, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { CategoryIcon } from "@/components/icon-picker";

export const Route = createFileRoute("/_app/historico")({
  component: HistoricoPage,
});

function HistoricoPage() {
  const { user } = useAuth();
  const { data: txs } = useRealtimeQuery("transactions", user?.id, (q) =>
    q.order("date", { ascending: false }).limit(5000)
  );
  const { data: cats } = useRealtimeQuery("categories", user?.id);
  const { data: installments } = useRealtimeQuery("installment_purchases", user?.id);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // year -> month -> txs (only past or current months)
  const grouped = useMemo(() => {
    const map = new Map<number, Map<number, any[]>>();
    txs.forEach((t: any) => {
      const dt = parseLocalDate(t.date);
      if (!dt) return;
      if (dt > today) return;
      const y = dt.getFullYear();
      const m = dt.getMonth();
      if (!map.has(y)) map.set(y, new Map());
      const months = map.get(y)!;
      if (!months.has(m)) months.set(m, []);
      months.get(m)!.push(t);
    });
    return map;
  }, [txs, today]);

  const currentYear = today.getFullYear();
  const years = useMemo(() => {
    const set = new Set<number>(grouped.keys());
    set.add(currentYear);
    return Array.from(set).filter((y) => y <= currentYear).sort((a, b) => b - a);
  }, [grouped, currentYear]);

  const [year, setYear] = useState<number>(currentYear);
  const [openMonth, setOpenMonth] = useState<number | null>(null);

  const monthsData = useMemo(() => {
    const m = grouped.get(year);
    return Array.from({ length: 12 }, (_, idx) => {
      const items = m?.get(idx) ?? [];
      const income = items.filter((t) => t.kind === "income").reduce((s, t) => s + Number(t.amount), 0);
      const expense = items.filter((t) => t.kind === "expense").reduce((s, t) => s + Number(t.amount), 0);
      const isFuture = year > currentYear || (year === currentYear && idx > today.getMonth());
      const empty = items.length === 0;
      return { month: idx, items, income, expense, balance: income - expense, isFuture, empty };
    });
  }, [grouped, year, currentYear, today]);

  const installmentLastByPurchase = useMemo(() => {
    const map = new Map<string, string>();
    (installments as any[]).forEach((p) => {
      if (!p?.first_date || !p?.installments_total) return;
      const dates = installmentDates(p.first_date, p.installments_total);
      map.set(p.id, dates[dates.length - 1]);
    });
    return map;
  }, [installments]);

  if (txs.length === 0 && years.length === 1) {
    return (
      <div className="px-6 md:px-10 py-8 max-w-[1100px] mx-auto">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Histórico</h1>
        <Card className="p-12 text-center shadow-soft mt-6">
          <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma transação registrada ainda.</p>
        </Card>
      </div>
    );
  }

  if (openMonth !== null) {
    const data = monthsData[openMonth];
    return (
      <div className="px-6 md:px-10 py-8 max-w-[1100px] mx-auto">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => setOpenMonth(null)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            {MONTH_NAMES[openMonth]} <span className="text-muted-foreground font-normal">{year}</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {data.items.length} lançamento{data.items.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="p-5 shadow-soft">
            <p className="text-xs text-muted-foreground">Entradas</p>
            <p className="text-xl font-semibold tabular text-success mt-1">{fmtMoney(data.income)}</p>
          </Card>
          <Card className="p-5 shadow-soft">
            <p className="text-xs text-muted-foreground">Saídas</p>
            <p className="text-xl font-semibold tabular mt-1">{fmtMoney(data.expense)}</p>
          </Card>
          <Card className="p-5 shadow-soft">
            <p className="text-xs text-muted-foreground">Saldo</p>
            <p className={`text-xl font-semibold tabular mt-1 ${data.balance >= 0 ? "text-success" : "text-destructive"}`}>{fmtMoney(data.balance)}</p>
          </Card>
        </div>

        <Card className="shadow-soft overflow-hidden">
          <ul className="divide-y divide-border">
            {data.items.map((t: any) => {
              const cat = (cats as any[]).find((c) => c.id === t.category_id);
              const lastDate = t.installment_purchase_id ? installmentLastByPurchase.get(t.installment_purchase_id) : null;
              return (
                <li key={t.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: (cat?.color ?? "#94a3b8") + "1a", color: cat?.color ?? "#94a3b8" }}>
                    {t.kind === "income" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate flex items-center gap-2">
                      <CategoryIcon name={cat?.icon} className="h-3 w-3 text-muted-foreground" />
                      {t.description ?? cat?.name ?? "Lançamento"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {cat?.name ?? "—"} • {fmtDate(t.date)}
                      {lastDate && (
                        <span className="text-muted-foreground/70"> · (Última parcela: {fmtDate(lastDate).slice(3)})</span>
                      )}
                    </p>
                  </div>
                  <span className={`tabular text-sm font-medium ${t.kind === "income" ? "text-success" : "text-foreground"}`}>
                    {t.kind === "income" ? "+" : "−"} {fmtMoney(t.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1100px] mx-auto">
      <div className="mb-6 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Histórico</h1>
          <p className="text-muted-foreground text-sm mt-1">Análise mês a mês</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            disabled={!years.some((y) => y < year)}
            onClick={() => {
              const prev = years.filter((y) => y < year)[0];
              if (prev !== undefined) setYear(prev);
            }}
            aria-label="Ano anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="w-28">
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            disabled={!years.some((y) => y > year)}
            onClick={() => {
              const next = [...years].reverse().filter((y) => y > year)[0];
              if (next !== undefined) setYear(next);
            }}
            aria-label="Próximo ano"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {monthsData.map((m) => {
          const disabled = m.isFuture || m.empty;
          return (
            <button
              key={m.month}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && setOpenMonth(m.month)}
              className={`text-left rounded-xl border p-4 transition-colors ${
                disabled
                  ? "bg-muted/30 border-border/60 text-muted-foreground/60 cursor-not-allowed"
                  : "bg-card border-border hover:border-primary/40 hover:bg-muted/20 shadow-soft"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">{MONTH_NAMES[m.month]}</p>
                {m.isFuture && <span className="text-[10px] uppercase text-muted-foreground/60">Futuro</span>}
              </div>
              {disabled ? (
                <p className="text-xs">{m.isFuture ? "—" : "Sem lançamentos"}</p>
              ) : (
                <>
                  <p className={`text-lg font-semibold tabular ${m.balance >= 0 ? "text-success" : "text-destructive"}`}>
                    {fmtMoney(m.balance)}
                  </p>
                  <p className="text-[11px] text-muted-foreground tabular mt-0.5">
                    {m.items.length} lançamento{m.items.length !== 1 ? "s" : ""}
                  </p>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
