import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useRealtimeQuery } from "@/lib/data-hooks";
import { fmtMoney, monthRange, monthLabel, daysUntil, dueUrgency, fmtDate, type DueUrgency } from "@/lib/finance";
import { Card } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight, TrendingUp, Wallet, CreditCard as CreditCardIcon, AlertCircle, Clock } from "lucide-react";
import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

function KPI({ label, value, hint, icon: Icon, tone = "default" }: {
  label: string; value: string; hint?: string;
  icon: React.ElementType;
  tone?: "default" | "success" | "danger";
}) {
  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular tracking-tight">{value}</p>
          {hint && (
            <p className={`mt-1 text-xs tabular ${
              tone === "success" ? "text-success" : tone === "danger" ? "text-destructive" : "text-muted-foreground"
            }`}>
              {hint}
            </p>
          )}
        </div>
        <div className="h-9 w-9 rounded-lg bg-primary-soft flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
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

  const totals = useMemo(() => {
    const income = txs
      .filter((t: any) => t?.kind === "income")
      .reduce((s: number, t: any) => s + (Number(t?.amount) || 0), 0);
    const expense = txs
      .filter((t: any) => t?.kind === "expense")
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

  const byCategory = useMemo(() => {
    const map = new Map<string, { name: string; value: number; color: string }>();
    txs
      .filter((t: any) => t?.kind === "expense")
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
    <div className="px-6 md:px-10 py-8 max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Olá{user?.user_metadata?.name ? `, ${user.user_metadata.name}` : ""}</h1>
          <p className="text-muted-foreground mt-1 capitalize">Visão geral de {monthLabel()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPI label="Entradas" value={fmtMoney(totals.income)} icon={ArrowUpRight} tone="success" hint="receitas do mês" />
        <KPI label="Saídas" value={fmtMoney(totals.expense)} icon={ArrowDownRight} tone="danger" hint="despesas do mês" />
        <KPI label="Saldo" value={fmtMoney(totals.balance)} icon={Wallet} tone={totals.balance >= 0 ? "success" : "danger"} hint="entradas − saídas" />
        <KPI label="A receber" value={fmtMoney(pendingReceivable)} icon={TrendingUp} hint={`${receivables.filter((r: any) => r?.status === "pending").length} pendentes`} />
      </div>

      {/* Próximos Vencimentos */}
      <Card className="p-6 shadow-soft mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-medium flex items-center gap-2"><AlertCircle className="h-4 w-4 text-primary" /> Próximos vencimentos</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Contas, faturas e mensalidades nos próximos dias</p>
          </div>
        </div>
        {upcoming.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Nenhum vencimento próximo. 🎉</div>
        ) : (
          <ul className="divide-y divide-border">
            {upcoming.map((u) => <DueRow key={u.id} item={u} />)}
          </ul>
        )}
      </Card>

      <div className="grid lg:grid-cols-3 gap-4 mb-8">
        <Card className="p-6 lg:col-span-2 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium">Despesas por categoria</h2>
            <span className="text-xs text-muted-foreground tabular">{fmtMoney(totals.expense)}</span>
          </div>
          {byCategory.length === 0 ? (
            <EmptyState message="Nenhuma despesa este mês." />
          ) : (
            <div className="grid md:grid-cols-2 gap-6 items-center">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byCategory} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={2}>
                      {byCategory.map((c, i) => <Cell key={i} fill={c.color} />)}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => fmtMoney(v)}
                      contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {byCategory.slice(0, 6).map((c) => {
                  const pct = totals.expense > 0 ? (c.value / totals.expense) * 100 : 0;
                  return (
                    <div key={c.name} className="flex items-center gap-3 text-sm">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="tabular text-muted-foreground">{pct.toFixed(0)}%</span>
                      <span className="tabular font-medium w-24 text-right">{fmtMoney(c.value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium">Lançamentos recentes</h2>
          </div>
          {txs.length === 0 ? (
            <EmptyState message="Nenhum lançamento ainda." />
          ) : (
            <ul className="space-y-3">
              {txs.slice(0, 6).map((t: any) => {
                const cat = cats.find((c: any) => c.id === t.category_id);
                return (
                  <li key={t.id} className="flex items-center gap-3 text-sm">
                    <span className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: (cat?.color ?? "#94a3b8") + "1a", color: cat?.color ?? "#94a3b8" }}>
                      <CreditCardIcon className="h-3.5 w-3.5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{t.description ?? cat?.name ?? "Lançamento"}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(t.date)}</p>
                    </div>
                    <span className={`tabular font-medium ${t.kind === "income" ? "text-success" : "text-foreground"}`}>
                      {t.kind === "income" ? "+" : "−"} {fmtMoney(t.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <Link to="/transacoes" className="mt-4 inline-block text-xs text-primary hover:underline">
            Ver todos →
          </Link>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium">Cartões</h2>
          <Link to="/cartoes" className="text-xs text-primary hover:underline">Gerenciar →</Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cardsWithUsage.length === 0 ? (
            <Card className="p-6 shadow-soft sm:col-span-2 lg:col-span-3">
              <EmptyState message="Cadastre seu primeiro cartão para acompanhar fatura e parcelas." />
            </Card>
          ) : (
            cardsWithUsage.map((c: any) => (
              <Card key={c.id} className="p-5 shadow-soft">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{c.brand ?? "Cartão"}</p>
                    <p className="font-medium mt-0.5">{c.name}</p>
                  </div>
                  <div className="h-7 w-10 rounded" style={{ background: c.color }} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground tabular">
                    <span>{fmtMoney(c.used)} usados</span>
                    <span>de {fmtMoney(c.limit_total)}</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{ width: `${Math.min(c.pct, 100)}%`, background: c.pct > 80 ? "var(--destructive)" : "var(--primary)" }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground tabular">{c.pct.toFixed(0)}% do limite • fecha dia {c.closing_day}</p>
                </div>
              </Card>
            ))
          )}
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

function urgencyLabel(u: DueUrgency, days: number) {
  if (u === "overdue") return `Atrasado ${Math.abs(days)}d`;
  if (u === "today") return "Hoje";
  if (u === "soon") return `Em ${days}d`;
  return `Em ${days}d`;
}

function urgencyStyles(u: DueUrgency) {
  if (u === "overdue" || u === "today") return {
    bg: "bg-destructive/10", fg: "text-destructive",
    badgeBg: "bg-destructive/10", badgeFg: "text-destructive",
  };
  if (u === "soon") return {
    bg: "bg-warning/10", fg: "text-warning-foreground",
    badgeBg: "bg-warning/10", badgeFg: "text-warning-foreground",
  };
  return {
    bg: "bg-primary-soft", fg: "text-primary",
    badgeBg: "bg-secondary", badgeFg: "text-muted-foreground",
  };
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-8 text-sm text-muted-foreground">{message}</div>
  );
}
