import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useRealtimeQuery } from "@/lib/data-hooks";
import { fmtMoney, monthRange, monthLabel, daysUntil, dueUrgency, fmtDate, type DueUrgency } from "@/lib/finance";
import { Card } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight, TrendingUp, Wallet, CreditCard as CreditCardIcon, AlertCircle, Clock } from "lucide-react";
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { CreditCardVisual } from "@/components/credit-card-visual";
import { cn } from "@/lib/utils";
import { usePrivacy } from "@/lib/privacy-context";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

function KPI({ label, value, hint, icon: Icon, tone = "default", delay = 0 }: {
  label: string; value: string; hint?: string;
  icon: React.ElementType;
  tone?: "default" | "success" | "danger";
  delay?: number;
}) {
  const ring =
    tone === "success" ? "shadow-[inset_0_0_0_1px_rgba(16,185,129,0.25)]"
    : tone === "danger" ? "shadow-[inset_0_0_0_1px_rgba(244,63,94,0.25)]"
    : "";
  return (
    <Card className={cn("p-5 fade-up", ring)} style={{ animationDelay: `${delay}ms` } as React.CSSProperties}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">{label}</p>
          <p className="mt-2 text-3xl font-semibold tabular tracking-tight truncate text-white">{value}</p>
          {hint && (
            <p className={cn("mt-1 text-xs tabular truncate",
              tone === "success" ? "text-emerald-400" : tone === "danger" ? "text-rose-400" : "text-gray-400"
            )}>
              {hint}
            </p>
          )}
        </div>
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border border-white/5",
          tone === "success" ? "bg-emerald-500/10 text-emerald-300"
          : tone === "danger" ? "bg-rose-500/10 text-rose-300"
          : "bg-white/5 text-purple-300"
        )}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}

type DueItem = {
  id: string;
  label: string;
  source: string;
  amount: number;
  date: string;
  urgency: DueUrgency;
  daysLeft: number;
};

function Dashboard() {
  const { user } = useAuth();
  const { hidden } = usePrivacy();
  const range = monthRange();
  const { data: txsData } = useRealtimeQuery("transactions", user?.id, (q) =>
    q.gte("date", range.start).lte("date", range.end).order("date", { ascending: false })
  );
  const { data: allTxsData } = useRealtimeQuery("transactions", user?.id, (q) =>
    q.not("due_date", "is", null).order("due_date", { ascending: true }).limit(100)
  );
  const { data: cardsData } = useRealtimeQuery("credit_cards", user?.id);
  const { data: receivablesData } = useRealtimeQuery("receivables", user?.id);
  const { data: catsData } = useRealtimeQuery("categories", user?.id);
  const { data: ongoingData } = useRealtimeQuery("ongoing_expenses", user?.id);

  // Defensive defaults — never trust the source array shape
  const txs = Array.isArray(txsData) ? txsData : [];
  const allTxs = Array.isArray(allTxsData) ? allTxsData : [];
  const cards = Array.isArray(cardsData) ? cardsData : [];
  const receivables = Array.isArray(receivablesData) ? receivablesData : [];
  const cats = Array.isArray(catsData) ? catsData : [];
  const ongoing = Array.isArray(ongoingData) ? ongoingData : [];

  // KPIs: contar TODAS as despesas do mês (incluindo cartão), excluindo
  // o lançamento "Pagamento de Fatura" para evitar dupla contagem,
  // já que as compras do cartão já estão somadas individualmente.
  const totals = useMemo(() => {
    const income = txs
      .filter((t: any) => t?.kind === "income")
      .reduce((s: number, t: any) => s + (Number(t?.amount) || 0), 0);
    const expense = txs
      .filter((t: any) => t?.kind === "expense" && t?.payment_method !== "invoice")
      .reduce((s: number, t: any) => s + (Number(t?.amount) || 0), 0);
    return { income, expense, balance: income - expense };
  }, [txs]);

  const pendingReceivable = useMemo(
    () =>
      receivables
        .filter((r: any) => r?.status === "pending")
        .reduce((s: number, r: any) => s + (Number(r?.amount) || 0), 0),
    [receivables]
  );

  // Gráfico por categoria: soma TODAS as despesas (débito + crédito),
  // excluindo apenas o lançamento "Pagamento de Fatura".
  const byCategory = useMemo(() => {
    const map = new Map<string, { name: string; value: number; color: string }>();
    txs
      .filter((t: any) => t?.kind === "expense" && t?.payment_method !== "invoice")
      .forEach((t: any) => {
        const cat = cats.find((c: any) => c?.id === t?.category_id);
        const k = cat?.id ?? "none";
        const cur = map.get(k) ?? { name: cat?.name ?? "Sem categoria", value: 0, color: cat?.color ?? "#94a3b8" };
        cur.value += Number(t?.amount) || 0;
        map.set(k, cur);
      });
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [txs, cats]);

  const cardsWithUsage = useMemo(() => {
    return cards.map((c: any) => {
      const limit = Number(c?.limit_total) || 0;
      const used = txs
        .filter((t: any) => t?.card_id === c?.id)
        .reduce((s: number, t: any) => s + (Number(t?.amount) || 0), 0);
      return { ...c, used, pct: limit > 0 ? (used / limit) * 100 : 0 };
    });
  }, [cards, txs]);

  // Próximos vencimentos (transações + faturas + assinaturas/parcelamentos)
  const upcoming = useMemo<DueItem[]>(() => {
    const items: DueItem[] = [];
    const today = new Date();
    const horizon = new Date();
    horizon.setDate(today.getDate() + 14);

    // Transactions com due_date e não pagas
    allTxs.forEach((t: any) => {
      if (!t?.due_date || t?.is_paid) return;
      const cat = cats.find((c: any) => c?.id === t?.category_id);
      const u = dueUrgency(t.due_date);
      if (u === "future") return;
      items.push({
        id: `tx-${t.id}`,
        label: t.description ?? cat?.name ?? "Lançamento",
        source: cat?.name ?? "Conta",
        amount: Number(t.amount) || 0,
        date: t.due_date,
        urgency: u,
        daysLeft: daysUntil(t.due_date),
      });
    });

    // Cartões com next_due_date
    cards.forEach((c: any) => {
      if (!c?.next_due_date) return;
      const u = dueUrgency(c.next_due_date);
      if (u === "future") return;
      const used = txs
        .filter((t: any) => t?.card_id === c.id)
        .reduce((s: number, t: any) => s + (Number(t?.amount) || 0), 0);
      items.push({
        id: `card-${c.id}`,
        label: `Fatura ${c.name ?? "Cartão"}`,
        source: "Cartão de crédito",
        amount: used,
        date: c.next_due_date,
        urgency: u,
        daysLeft: daysUntil(c.next_due_date),
      });
    });

    // Assinaturas/parcelamentos com due_day → próximo vencimento
    ongoing.forEach((o: any) => {
      const day = Number(o?.due_day);
      if (!day || day < 1 || day > 31) return;
      const y = today.getFullYear();
      const m = today.getMonth();
      let dueDate = new Date(y, m, day);
      if (dueDate < today) dueDate = new Date(y, m + 1, day);
      if (dueDate > horizon) return;
      const iso = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`;
      const u = dueUrgency(iso);
      items.push({
        id: `og-${o.id}`,
        label: o.description ?? "Despesa fixa",
        source: o.kind === "subscription" ? "Assinatura" : "Parcelamento",
        amount: Number(o.monthly_value) || 0,
        date: iso,
        urgency: u,
        daysLeft: daysUntil(iso),
      });
    });

    return items
      .filter((i) => Number.isFinite(i.daysLeft))
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 8);
  }, [allTxs, cards, txs, ongoing, cats]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 fade-up">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Olá{user?.user_metadata?.name ? `, ${user.user_metadata.name}` : ""}
          </h1>
          <p className="text-sm text-gray-400 capitalize mt-1">Visão geral de {monthLabel()}</p>
        </div>
        <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-[11px] uppercase tracking-widest text-gray-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400 pulse-dot" />
          Sincronizado
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
        {/* Coluna principal */}
        <div className="space-y-6 min-w-0">
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <KPI label="Saldo" value={fmtMoney(totals.balance)} icon={Wallet} tone={totals.balance >= 0 ? "success" : "danger"} hint="entradas − saídas" delay={0} />
            <KPI label="Receitas" value={fmtMoney(totals.income)} icon={ArrowUpRight} tone="success" hint="receitas do mês" delay={80} />
            <KPI label="Despesas" value={fmtMoney(totals.expense)} icon={ArrowDownRight} tone="danger" hint="despesas do mês" delay={160} />
          </div>

          {/* Despesas por categoria — donut neon */}
          <Card className="p-5 fade-up" style={{ animationDelay: "240ms" } as React.CSSProperties}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-white uppercase tracking-widest">Categorias</h2>
              <span className="text-xs text-gray-400 tabular">{fmtMoney(totals.expense)}</span>
            </div>
            {byCategory.length === 0 ? (
              <EmptyState message="Nenhuma despesa este mês." />
            ) : (
              <div className="grid md:grid-cols-[200px_1fr] gap-6 items-center">
                <NeonDonut rows={byCategory} total={totals.expense} />
                <div className="space-y-2.5">
                  {byCategory.slice(0, 6).map((c) => {
                    const pct = totals.expense > 0 ? (c.value / totals.expense) * 100 : 0;
                    return (
                      <div key={c.name} className="flex items-center gap-3 text-xs">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0 shadow-[0_0_10px_currentColor]" style={{ background: c.color, color: c.color }} />
                        <span className="flex-1 truncate text-gray-200">{c.name}</span>
                        <span className="tabular text-gray-500 w-10 text-right">{pct.toFixed(0)}%</span>
                        <span className="tabular font-medium w-24 text-right text-white">{fmtMoney(c.value)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* Atividade recente */}
          <Card className="p-5 fade-up" style={{ animationDelay: "320ms" } as React.CSSProperties}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-white uppercase tracking-widest">Atividade recente</h2>
              <Link to="/transacoes" className="text-xs text-purple-300 hover:text-purple-200 transition-colors">Ver todos →</Link>
            </div>
            {txs.length === 0 ? (
              <EmptyState message="Nenhum lançamento ainda." />
            ) : (
              <ul className="space-y-1">
                {txs.slice(0, 8).map((t: any) => {
                  const cat = cats.find((c: any) => c.id === t.category_id);
                  const isIncome = t.kind === "income";
                  return (
                    <li key={t.id} className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-white/5 transition-colors">
                      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center border border-white/5 shrink-0",
                        isIncome ? "bg-emerald-500/10 text-emerald-300" : "bg-white/5 text-gray-300"
                      )}>
                        {isIncome ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-white">{t.description ?? cat?.name ?? "Lançamento"}</p>
                        <p className="text-xs text-gray-400 truncate">{cat?.name ?? "Sem categoria"} • {fmtDate(t.date)}</p>
                      </div>
                      <span className={cn("tabular font-semibold text-sm shrink-0", isIncome ? "text-emerald-400" : "text-white")}>
                        {isIncome ? "+" : "−"} {fmtMoney(t.amount)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* Próximos vencimentos */}
          <Card className="p-5 fade-up" style={{ animationDelay: "400ms" } as React.CSSProperties}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-white uppercase tracking-widest">Próximos vencimentos</h2>
              <span className="text-xs text-gray-400">{upcoming.length} itens</span>
            </div>
            {upcoming.length === 0 ? (
              <EmptyState message="Nenhum vencimento próximo. 🎉" />
            ) : (
              <ul className="divide-y divide-white/5">
                {upcoming.slice(0, 8).map((u) => {
                  const styles = urgencyStyles(u.urgency);
                  return (
                    <li key={u.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-white">{u.label}</p>
                        <p className="text-xs text-gray-400 truncate">{u.source} • {fmtDate(u.date)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="tabular font-semibold text-sm text-white">{fmtMoney(u.amount)}</span>
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap", styles.badgeBg, styles.badgeFg)}>
                          {urgencyLabel(u.urgency, u.daysLeft)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        {/* Coluna direita — Carteiras */}
        <div className="space-y-4 fade-up" style={{ animationDelay: "240ms" } as React.CSSProperties}>
          <Card className="p-5 xl:sticky xl:top-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-white uppercase tracking-widest">Minhas carteiras</h2>
              <Link to="/cartoes" className="text-xs text-purple-300 hover:text-purple-200 transition-colors">Ver →</Link>
            </div>
            {cardsWithUsage.length === 0 ? (
              <EmptyState message="Cadastre seu primeiro cartão." />
            ) : (
              <div
                className="max-h-[760px] overflow-y-auto pr-1 -mr-1 space-y-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: "none" }}
              >
                {cardsWithUsage.map((c: any, idx: number) => {
                  const high = c.pct > 80;
                  return (
                    <div key={c.id} className="space-y-2 fade-up" style={{ animationDelay: `${300 + idx * 80}ms` } as React.CSSProperties}>
                      <CreditCardVisual
                        name={c.name}
                        brand={c.brand}
                        color={c.color}
                        holder={c.card_holder_name}
                        lastFour={c.last_four_digits}
                        hidden={hidden}
                      />
                      <div className="flex justify-between text-[10px] uppercase tracking-widest text-gray-400 pt-1">
                        <span>Fatura</span>
                        <span>Limite</span>
                      </div>
                      <div className="flex justify-between text-xs tabular text-white font-medium">
                        <span>{fmtMoney(c.used)}</span>
                        <span className="text-gray-400">{fmtMoney(c.limit_total)}</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(c.pct, 100)}%`,
                            background: high
                              ? "linear-gradient(90deg, #f43f5e, #ef4444)"
                              : "linear-gradient(90deg, #a855f7, #6366f1)",
                            boxShadow: high
                              ? "0 0 12px rgba(244,63,94,0.6)"
                              : "0 0 12px rgba(168,85,247,0.6)",
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-500 tabular">{c.pct.toFixed(0)}% usado • fecha dia {c.closing_day}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function DueRow({ item }: { item: DueItem }) {
  const styles = urgencyStyles(item.urgency);
  return (
    <li className="flex items-center gap-4 py-3">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${styles.bg}`}>
        <Clock className={`h-4 w-4 ${styles.fg}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.label}</p>
        <p className="text-xs text-muted-foreground">{item.source} • {fmtDate(item.date)}</p>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full ${styles.badgeBg} ${styles.badgeFg} whitespace-nowrap`}>
        {urgencyLabel(item.urgency, item.daysLeft)}
      </span>
      <span className="tabular font-medium text-sm w-24 text-right">{fmtMoney(item.amount)}</span>
    </li>
  );
}

function NeonDonut({ rows, total }: { rows: { name: string; value: number; color: string }[]; total: number }) {
  const safeRows = rows.filter((r) => Number.isFinite(r.value) && r.value > 0);
  const size = 180;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const gap = 6; // gap em px entre segmentos
  let acc = 0;

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} fill="none" />
        {safeRows.map((row) => {
          const pct = total > 0 ? row.value / total : 0;
          const len = Math.max(circ * pct - gap, 0);
          const dashArray = `${len} ${circ}`;
          const dashOffset = -acc;
          acc += circ * pct;
          return (
            <circle
              key={row.name}
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={row.color}
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              style={{ filter: `drop-shadow(0 0 6px ${row.color})` }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold text-white tabular">{safeRows.length}</span>
        <span className="text-[10px] uppercase tracking-widest text-gray-400 mt-0.5">categorias</span>
      </div>
    </div>
  );
}

function urgencyLabel(u: DueUrgency, days: number) {
  if (u === "overdue") return `Atrasado ${Math.abs(days)}d`;
  if (u === "today") return "Hoje";
  if (u === "soon") return `Em ${days}d`;
  return `Em ${days}d`;
}

function urgencyStyles(u: DueUrgency) {
  if (u === "overdue" || u === "today") return {
    bg: "bg-rose-500/10", fg: "text-rose-300",
    badgeBg: "bg-rose-500/15 border border-rose-500/30", badgeFg: "text-rose-300",
  };
  if (u === "soon") return {
    bg: "bg-amber-500/10", fg: "text-amber-300",
    badgeBg: "bg-amber-500/15 border border-amber-500/30", badgeFg: "text-amber-300",
  };
  return {
    bg: "bg-white/5", fg: "text-purple-300",
    badgeBg: "bg-white/5 border border-white/10", badgeFg: "text-gray-300",
  };
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-8 text-sm text-gray-500">{message}</div>
  );
}
