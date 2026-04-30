import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useRealtimeQuery } from "@/lib/data-hooks";
import { fmtMoney, MONTH_NAMES } from "@/lib/finance";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowDownRight, ArrowUpRight, Calendar, ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_app/historico")({
  component: HistoricoPage,
});

function HistoricoPage() {
  const { user } = useAuth();
  const { data: txs } = useRealtimeQuery("transactions", user?.id, (q) =>
    q.order("date", { ascending: false }).limit(5000)
  );
  const { data: cats } = useRealtimeQuery("categories", user?.id);

  const grouped = useMemo(() => {
    // year -> month -> txs
    const map = new Map<number, Map<number, any[]>>();
    txs.forEach((t: any) => {
      const dt = new Date(t.date);
      const y = dt.getFullYear();
      const m = dt.getMonth();
      if (!map.has(y)) map.set(y, new Map());
      const months = map.get(y)!;
      if (!months.has(m)) months.set(m, []);
      months.get(m)!.push(t);
    });
    return map;
  }, [txs]);

  const years = useMemo(
    () => Array.from(grouped.keys()).sort((a, b) => b - a),
    [grouped]
  );
  const [year, setYear] = useState<number | null>(null);
  const activeYear = year ?? years[0] ?? null;

  const months = useMemo(() => {
    if (activeYear === null) return [];
    const m = grouped.get(activeYear);
    if (!m) return [];
    return Array.from(m.entries())
      .map(([month, items]) => {
        const income = items.filter((t) => t.kind === "income").reduce((s, t) => s + Number(t.amount), 0);
        const expense = items.filter((t) => t.kind === "expense").reduce((s, t) => s + Number(t.amount), 0);
        return { month, items, income, expense, balance: income - expense };
      })
      .sort((a, b) => b.month - a.month);
  }, [grouped, activeYear]);

  const [openMonth, setOpenMonth] = useState<number | null>(null);

  if (years.length === 0) {
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

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1100px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Histórico</h1>
        <p className="text-muted-foreground text-sm mt-1">Análise mês a mês</p>
      </div>

      {/* Year selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {years.map((y) => (
          <Button
            key={y}
            variant={y === activeYear ? "default" : "outline"}
            size="sm"
            onClick={() => { setYear(y); setOpenMonth(null); }}
          >
            {y}
          </Button>
        ))}
      </div>

      {/* Months */}
      <div className="space-y-2">
        {months.map((m) => {
          const isOpen = openMonth === m.month;
          return (
            <Card key={m.month} className="shadow-soft overflow-hidden">
              <button
                onClick={() => setOpenMonth(isOpen ? null : m.month)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors text-left"
              >
                {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                <div className="flex-1">
                  <p className="font-medium">{MONTH_NAMES[m.month]}</p>
                  <p className="text-xs text-muted-foreground">{m.items.length} lançamento{m.items.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="hidden sm:block text-right">
                  <p className="text-xs text-muted-foreground">Entradas</p>
                  <p className="text-sm tabular text-success">{fmtMoney(m.income)}</p>
                </div>
                <div className="hidden sm:block text-right">
                  <p className="text-xs text-muted-foreground">Saídas</p>
                  <p className="text-sm tabular">{fmtMoney(m.expense)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Saldo</p>
                  <p className={`text-sm tabular font-medium ${m.balance >= 0 ? "text-success" : "text-destructive"}`}>
                    {fmtMoney(m.balance)}
                  </p>
                </div>
              </button>

              {isOpen && (
                <ul className="divide-y divide-border border-t border-border bg-muted/20">
                  {m.items.map((t: any) => {
                    const cat = cats.find((c: any) => c.id === t.category_id);
                    return (
                      <li key={t.id} className="flex items-center gap-4 px-5 py-3">
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: (cat?.color ?? "#94a3b8") + "1a", color: cat?.color ?? "#94a3b8" }}>
                          {t.kind === "income" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{t.description ?? cat?.name ?? "Lançamento"}</p>
                          <p className="text-xs text-muted-foreground">{cat?.name ?? "—"} • {new Date(t.date).toLocaleDateString("pt-BR")}</p>
                        </div>
                        <span className={`tabular text-sm font-medium ${t.kind === "income" ? "text-success" : "text-foreground"}`}>
                          {t.kind === "income" ? "+" : "−"} {fmtMoney(t.amount)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
