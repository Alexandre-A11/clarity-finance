import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useRealtimeQuery } from "@/lib/data-hooks";
import { fmtMoney, fmtDate, todayISO, monthRange, toLocalISODate, installmentDates } from "@/lib/finance";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus, Trash2, ArrowUpDown,
  Landmark, Smartphone, Banknote, CreditCard as CardLucide, Receipt, FastForward,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/icon-picker";
import { CategoryManagerTrigger } from "@/components/category-manager";
import { DatePicker } from "@/components/date-picker";
import { NumberedPagination } from "@/components/numbered-pagination";
import { usePrivacy } from "@/lib/privacy-context";

type TxSearch = {
  action?: "pay-invoice";
  cardId?: string;
};

export const Route = createFileRoute("/_app/transacoes")({
  validateSearch: (s: Record<string, unknown>): TxSearch => ({
    action: s.action === "pay-invoice" ? "pay-invoice" : undefined,
    cardId: typeof s.cardId === "string" ? s.cardId : undefined,
  }),
  component: TransacoesPage,
});

type PayMethod = "checking" | "pix" | "cash" | "card" | "invoice";
const PAGE_SIZE = 15;

const METHOD_META: Record<PayMethod, { label: string; Icon: React.ElementType; color: string }> = {
  checking: { label: "Conta corrente", Icon: Landmark, color: "var(--primary)" },
  pix:      { label: "Pix",             Icon: Smartphone, color: "#10b981" },
  cash:     { label: "Dinheiro",        Icon: Banknote, color: "#f59e0b" },
  card:     { label: "Cartão",          Icon: CardLucide, color: "#8b5cf6" },
  invoice:  { label: "Pagto. Fatura",   Icon: Receipt, color: "#0ea5e9" },
};

function MethodBadge({ method }: { method?: PayMethod | null }) {
  const m = (method && METHOD_META[method]) ? method : "checking";
  const { label, Icon, color } = METHOD_META[m as PayMethod];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full"
      style={{ background: `color-mix(in oklab, ${color} 12%, transparent)`, color }}
      title={label}
    >
      <Icon className="h-3 w-3" />
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}

function TransacoesPage() {
  usePrivacy();
  const search = useSearch({ from: "/_app/transacoes" });

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1200px] mx-auto">
      <div className="mb-6 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transações</h1>
          <p className="text-muted-foreground text-sm mt-1">Fluxo de caixa — entradas e saídas efetivadas</p>
        </div>
        <CategoryManagerTrigger />
      </div>

      <Tabs defaultValue="lancamentos">
        <TabsList>
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="receber">A receber</TabsTrigger>
        </TabsList>

        <TabsContent value="lancamentos" className="mt-6">
          <LancamentosTab initialAction={search.action} initialCardId={search.cardId} />
        </TabsContent>

        <TabsContent value="receber" className="mt-6">
          <ReceberTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type SortKey = "date" | "description" | "method";

function LancamentosTab({ initialAction, initialCardId }: { initialAction?: string; initialCardId?: string }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const { data: allTxs } = useRealtimeQuery("transactions", user?.id, (q) =>
    q.order("date", { ascending: false }).limit(2000)
  );
  const { data: cats } = useRealtimeQuery("categories", user?.id);
  const [open, setOpen] = useState(false);
  const [showFuture, setShowFuture] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (initialAction === "pay-invoice") {
      setOpen(true);
      nav({ to: "/transacoes", search: {}, replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAction]);

  // Cash-flow view: exclude card purchases (they belong to the invoice).
  const cashFlowTxs = useMemo(
    () => allTxs.filter((t: any) => !t.card_id),
    [allTxs],
  );
  const { end: monthEnd } = monthRange(new Date());
  const visibleTxs = showFuture ? cashFlowTxs : cashFlowTxs.filter((t: any) => (t.date ?? "") <= monthEnd);
  const hiddenCount = cashFlowTxs.length - visibleTxs.length;

  const sorted = useMemo(() => {
    const arr = [...visibleTxs];
    arr.sort((a: any, b: any) => {
      let cmp = 0;
      if (sortKey === "date") cmp = (a.date ?? "").localeCompare(b.date ?? "");
      else if (sortKey === "description") {
        const an = (a.description ?? cats.find((c: any) => c.id === a.category_id)?.name ?? "").toString();
        const bn = (b.description ?? cats.find((c: any) => c.id === b.category_id)?.name ?? "").toString();
        cmp = an.localeCompare(bn, "pt-BR", { sensitivity: "base" });
      } else if (sortKey === "method") {
        cmp = (a.payment_method ?? "checking").localeCompare(b.payment_method ?? "checking");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [visibleTxs, sortKey, sortDir, cats]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [sortKey, sortDir, showFuture]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "date" ? "desc" : "asc"); }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) toast.error(error.message); else toast.success("Removido");
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="text-xs text-muted-foreground">
          Fluxo de caixa real (entradas e saídas da conta).
          {" "}{showFuture
            ? `Mostrando todas (${cashFlowTxs.length}).`
            : `Mostrando até o mês atual${hiddenCount > 0 ? ` · ${hiddenCount} parcela(s) futura(s) oculta(s)` : ""}.`}
        </div>
        <div className="flex items-center gap-2">
          {hiddenCount > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setShowFuture((v) => !v)}>
              {showFuture ? "Ocultar parcelas futuras" : "Mostrar parcelas futuras"}
            </Button>
          )}
          <Select value={`${sortKey}:${sortDir}`} onValueChange={(v) => { const [k, d] = v.split(":") as [SortKey, "asc"|"desc"]; setSortKey(k); setSortDir(d); }}>
            <SelectTrigger className="h-9 w-[180px]"><ArrowUpDown className="h-3.5 w-3.5 mr-1 opacity-60" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="date:desc">Data (recente)</SelectItem>
              <SelectItem value="date:asc">Data (antiga)</SelectItem>
              <SelectItem value="description:asc">A → Z</SelectItem>
              <SelectItem value="description:desc">Z → A</SelectItem>
              <SelectItem value="method:asc">Meio de pagamento</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> Nova</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nova transação</DialogTitle></DialogHeader>
              <TxForm
                cats={cats}
                userId={user!.id}
                onDone={() => setOpen(false)}
                preselectInvoiceCardId={initialAction === "pay-invoice" ? initialCardId : undefined}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="shadow-soft overflow-hidden">
        {pageRows.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Nenhuma transação. Clique em <b>Nova</b> para começar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground bg-muted/40">
                <tr>
                  <th className="text-center px-4 py-3 font-medium w-32 cursor-pointer select-none" onClick={() => toggleSort("date")}>
                    Data
                  </th>
                  <th className="text-left px-5 py-3 font-medium cursor-pointer select-none" onClick={() => toggleSort("description")}>
                    Descrição
                  </th>
                  <th className="text-left px-3 py-3 font-medium">Categoria</th>
                  <th className="text-left px-3 py-3 font-medium cursor-pointer select-none" onClick={() => toggleSort("method")}>
                    Meio
                  </th>
                  <th className="text-right px-4 py-3 font-medium w-32">Valor</th>
                  <th className="px-3 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pageRows.map((t: any) => {
                  const cat = cats.find((c: any) => c.id === t.category_id);
                  const isInvoicePay = t.payment_method === "invoice";
                  return (
                    <tr key={t.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-center tabular text-muted-foreground">{fmtDate(t.date)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: (cat?.color ?? (isInvoicePay ? "#0ea5e9" : "#94a3b8")) + "1a", color: cat?.color ?? (isInvoicePay ? "#0ea5e9" : "#94a3b8") }}
                          >
                            {isInvoicePay
                              ? <Receipt className="h-3.5 w-3.5" />
                              : <CategoryIcon name={cat?.icon} className="h-3.5 w-3.5" />}
                          </span>
                          <span className="truncate">{t.description ?? cat?.name ?? "Lançamento"}</span>
                          {isInvoicePay && (
                            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                              Fatura
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{cat?.name ?? (isInvoicePay ? "Cartão" : "—")}</td>
                      <td className="px-3 py-3"><MethodBadge method={t.payment_method as PayMethod} /></td>
                      <td className="px-4 py-3 text-right">
                        <span className={`tabular font-medium ${t.kind === "income" ? "text-success" : "text-foreground"}`}>
                          {t.kind === "income" ? "+" : "−"} {fmtMoney(t.amount)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => remove(t.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pageCount > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border text-xs text-muted-foreground gap-3 flex-wrap">
            <span>Página {safePage} de {pageCount} · {sorted.length} lançamento(s)</span>
            <NumberedPagination page={safePage} pageCount={pageCount} onPageChange={setPage} />
          </div>
        )}
      </Card>
    </>
  );
}

/* ============ Form ============ */

type CardAction = "expense" | "invoice";

function TxForm({
  cats, userId, onDone, preselectInvoiceCardId,
}: {
  cats: any[]; userId: string; onDone: () => void; preselectInvoiceCardId?: string;
}) {
  const { data: cards } = useRealtimeQuery("credit_cards", userId);
  const { data: allTxs } = useRealtimeQuery("transactions", userId);
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [method, setMethod] = useState<PayMethod>(preselectInvoiceCardId ? "card" : "checking");
  const [cardAction, setCardAction] = useState<CardAction>(preselectInvoiceCardId ? "invoice" : "expense");
  const [cardId, setCardId] = useState<string>(preselectInvoiceCardId ?? "");
  const [amount, setAmount] = useState("");
  const [discount, setDiscount] = useState("0");
  const [interest, setInterest] = useState("0");
  const [installments, setInstallments] = useState("1");
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const filtered = cats.filter((c: any) => c.kind === (kind === "income" ? "income" : "expense"));

  const isCardFlow = kind === "expense" && method === "card";
  const isInvoicePay = isCardFlow && cardAction === "invoice";

  // Invoice context — pending invoice = ALL unpaid card txs up to end of current month
  // (includes overdue from previous months too).
  const { end } = useMemo(() => monthRange(new Date()), []);
  const invoiceCard = cards.find((c: any) => c.id === cardId);
  const invoicePendingTxs = useMemo(
    () => allTxs.filter((t: any) =>
      t.card_id === cardId && t.is_paid === false && (t.date ?? "") <= end,
    ),
    [allTxs, cardId, end],
  );
  const invoicePending = invoicePendingTxs
    .reduce((s: number, t: any) => s + Number(t.amount), 0);

  // Future installments (after current month) — eligible for anticipation.
  const futureInstallments = useMemo(
    () => allTxs.filter((t: any) =>
      t.card_id === cardId && t.is_paid === false && (t.date ?? "") > end,
    ).sort((a: any, b: any) => (a.date ?? "").localeCompare(b.date ?? "")),
    [allTxs, cardId, end],
  );

  const [anticipateOpen, setAnticipateOpen] = useState(false);
  const [anticipated, setAnticipated] = useState<Set<string>>(new Set());
  const anticipatedTxs = futureInstallments.filter((t: any) => anticipated.has(t.id));
  const anticipatedTotal = anticipatedTxs.reduce((s: number, t: any) => s + Number(t.amount), 0);

  // Reset selections when card changes
  useEffect(() => { setAnticipated(new Set()); }, [cardId]);

  const originalTotal = invoicePending + anticipatedTotal;
  const discountValue = Math.max(0, Number(discount) || 0);
  const interestValue = Math.max(0, Number(interest) || 0);
  const cashOut = Math.max(originalTotal - discountValue + interestValue, 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    // --- INVOICE PAYMENT (with optional anticipation) ---
    if (isInvoicePay) {
      if (!cardId || !invoiceCard) { toast.error("Selecione o cartão"); return; }
      if (originalTotal <= 0) { toast.error("Nada a pagar nesta fatura"); return; }
      if (discountValue > originalTotal) { toast.error("Desconto maior que a fatura"); return; }
      setBusy(true);

      const fees = interestValue;
      const partsLabel = [
        `Pagamento Cartão ${invoiceCard.name}`,
        anticipatedTxs.length > 0 ? `+ ${anticipatedTxs.length} antecipada(s)` : null,
        fees > 0 ? "(+ juros)" : null,
        discountValue > 0 ? `(− ${discountValue.toFixed(2)} desc.)` : null,
      ].filter(Boolean).join(" ");
      const { error: e1 } = await supabase.from("transactions").insert({
        user_id: userId, kind: "expense", amount: cashOut, date,
        description: partsLabel, is_paid: true, card_id: null,
        payment_method: "invoice",
      } as any);
      if (e1) { setBusy(false); toast.error(e1.message); return; }

      // Bulk update: ALL included transactions → is_paid=true.
      // Per Regra de Ouro: keep original `amount` intact for accurate purchase history.
      // Anticipated items also have date moved to today so they show in current cash-flow window.
      const pendingIds = invoicePendingTxs.map((t: any) => t.id);
      if (pendingIds.length) {
        const { error: e2 } = await supabase.from("transactions")
          .update({ is_paid: true } as any).in("id", pendingIds);
        if (e2) { setBusy(false); toast.error(e2.message); return; }
      }
      const anticipatedIds = anticipatedTxs.map((t: any) => t.id);
      if (anticipatedIds.length) {
        const { error: e3 } = await supabase.from("transactions")
          .update({ is_paid: true, date } as any).in("id", anticipatedIds);
        if (e3) { setBusy(false); toast.error(e3.message); return; }
      }

      setBusy(false);
      toast.success(
        anticipatedTxs.length > 0
          ? `Fatura paga! ${fmtMoney(anticipatedTotal)} de parcelas futuras liquidadas${discountValue > 0 ? ` com ${fmtMoney(discountValue)} de desconto` : ""}.`
          : `Fatura paga com sucesso!${discountValue > 0 ? ` Desconto aplicado: ${fmtMoney(discountValue)}.` : ""}`,
        { duration: 6000 },
      );
      onDone();
      return;
    }

    // --- CARD PURCHASE (single or installments) ---
    if (isCardFlow && cardAction === "expense") {
      if (!cardId) { toast.error("Selecione qual cartão foi usado"); return; }
      const total = Number(amount);
      const n = Math.max(1, Math.min(60, parseInt(installments || "1", 10) || 1));
      if (!Number.isFinite(total) || total <= 0) { toast.error("Valor inválido"); return; }
      setBusy(true);

      if (n === 1) {
        const { error } = await supabase.from("transactions").insert({
          user_id: userId, kind: "expense", amount: total, date,
          description: description || null,
          category_id: categoryId || null,
          card_id: cardId, payment_method: "card",
          is_paid: false,
        } as any);
        setBusy(false);
        if (error) toast.error(error.message);
        else { toast.success("Lançado na fatura"); onDone(); }
        return;
      }

      // Installments: create installment_purchase + n transactions
      const monthly = total / n;
      const { data: purchase, error: pe } = await supabase.from("installment_purchases").insert({
        user_id: userId, card_id: cardId, description: description || "Compra parcelada",
        total_amount: total, installments_total: n, first_date: date,
        category_id: categoryId || null,
      } as any).select().single();
      if (pe || !purchase) { setBusy(false); toast.error(pe?.message ?? "Erro"); return; }
      const dates = installmentDates(date, n);
      const rows = dates.map((d, i) => ({
        user_id: userId, card_id: cardId, category_id: categoryId || null,
        date: d, amount: monthly, kind: "expense" as const,
        description: `${description || "Compra"} (${i + 1}/${n})`,
        is_installment: true, installment_purchase_id: (purchase as any).id,
        installment_index: i + 1, payment_method: "card",
        is_paid: false,
      }));
      const { error: te } = await supabase.from("transactions").insert(rows as any);
      setBusy(false);
      if (te) toast.error(te.message);
      else { toast.success(`${n} parcelas geradas`); onDone(); }
      return;
    }

    // --- REGULAR CASH-FLOW EXPENSE / INCOME ---
    setBusy(true);
    const { error } = await supabase.from("transactions").insert({
      user_id: userId, kind: kind === "income" ? "income" : "expense",
      amount: Number(amount), date,
      description: description || null,
      category_id: categoryId || null,
      card_id: null,
      payment_method: kind === "income" ? "checking" : method,
      is_paid: true,
    } as any);
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Adicionado"); onDone(); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant={kind === "expense" ? "default" : "outline"} onClick={() => setKind("expense")}>Despesa</Button>
        <Button type="button" variant={kind === "income" ? "default" : "outline"} onClick={() => setKind("income")}>Receita</Button>
      </div>

      {kind === "expense" && (
        <div className="space-y-2">
          <Label>Forma de pagamento</Label>
          <Select value={method} onValueChange={(v) => setMethod(v as PayMethod)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="checking">Conta corrente</SelectItem>
              <SelectItem value="pix">Pix</SelectItem>
              <SelectItem value="cash">Dinheiro</SelectItem>
              <SelectItem value="card">Cartão de crédito</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {isCardFlow && (
        <>
          <div className="space-y-2">
            <Label>O que deseja fazer com o cartão?</Label>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-muted">
              <Button type="button" size="sm"
                variant={cardAction === "expense" ? "default" : "ghost"}
                onClick={() => setCardAction("expense")}>
                <CardLucide className="h-3.5 w-3.5 mr-1.5" /> Registrar gasto
              </Button>
              <Button type="button" size="sm"
                variant={cardAction === "invoice" ? "default" : "ghost"}
                onClick={() => setCardAction("invoice")}>
                <Receipt className="h-3.5 w-3.5 mr-1.5" /> Pagar fatura
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cartão</Label>
            <Select value={cardId} onValueChange={setCardId} required>
              <SelectTrigger><SelectValue placeholder="Selecione o cartão" /></SelectTrigger>
              <SelectContent>
                {cards.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">Cadastre um cartão primeiro.</div>
                ) : cards.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3 w-4 rounded-sm" style={{ background: c.color }} />
                      {c.name} {c.brand ? `· ${c.brand}` : ""}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {isInvoicePay ? (
        <>
          {cardId && (
            <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fatura pendente</span>
                <span className="tabular font-medium">{fmtMoney(invoicePending)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{invoicePendingTxs.length} lançamento(s) pendente(s)</span>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Valor a pagar (R$)</Label>
              <Input type="number" step="0.01" min="0" required value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Juros/multa (opcional)</Label>
              <Input type="number" step="0.01" min="0" value={interest} onChange={(e) => setInterest(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Data do pagamento</Label>
            <DatePicker value={date} onChange={setDate} />
          </div>
          <div className="rounded-lg border border-border p-3 text-sm flex justify-between">
            <span className="text-muted-foreground">Total debitado da conta</span>
            <span className="tabular font-semibold">{fmtMoney((Number(amount) || 0) + (Number(interest) || 0))}</span>
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Salvando..." : "Confirmar pagamento da fatura"}
          </Button>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <Label>Data {isCardFlow ? "da compra" : "do lançamento"}</Label>
              <DatePicker value={date} onChange={setDate} />
            </div>
          </div>

          {isCardFlow && cardAction === "expense" && (
            <div className="space-y-2">
              <Label>Parcelas</Label>
              <Input
                type="number" min="1" max="60" value={installments}
                onChange={(e) => setInstallments(e.target.value)}
              />
              {Number(installments) > 1 && Number(amount) > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {installments}× de {fmtMoney(Number(amount) / Number(installments))}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Ex: Alimentação, Lazer, Saúde..." /></SelectTrigger>
              <SelectContent>
                {filtered.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mercado, Uber..." />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Salvando..." : isCardFlow ? "Lançar na fatura" : "Salvar"}
          </Button>
        </>
      )}
    </form>
  );
}

/* ============ A receber tab ============ */

function ReceberTab() {
  const { user } = useAuth();
  const { data: items } = useRealtimeQuery("receivables", user?.id);
  const { data: payments } = useRealtimeQuery("receivable_payments", user?.id);
  const [open, setOpen] = useState(false);

  const enriched = items.map((it: any) => {
    const itemPayments = payments.filter((p: any) => p.receivable_id === it.id);
    const received = itemPayments.reduce((s: number, p: any) => s + Number(p.amount), 0);
    const balance = Number(it.amount) - received;
    return { ...it, received, balance, payments: itemPayments };
  });

  const pending = enriched.filter((i) => i.balance > 0.009).reduce((s, i) => s + i.balance, 0);
  const received = enriched.reduce((s, i) => s + i.received, 0);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card className="p-5 shadow-soft">
          <p className="text-xs text-muted-foreground">A receber</p>
          <p className="text-2xl font-semibold tabular mt-1">{fmtMoney(pending)}</p>
        </Card>
        <Card className="p-5 shadow-soft">
          <p className="text-xs text-muted-foreground">Recebido</p>
          <p className="text-2xl font-semibold tabular mt-1 text-success">{fmtMoney(received)}</p>
        </Card>
      </div>

      <div className="flex justify-end mb-3">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> Novo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo a receber</DialogTitle></DialogHeader>
            <ReceberForm userId={user!.id} onDone={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-soft overflow-hidden">
        {enriched.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Sem cobranças.</div>
        ) : (
          <ul className="divide-y divide-border">
            {enriched.map((r) => (
              <li key={r.id} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.debtor_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Total {fmtMoney(r.amount)} • Recebido {fmtMoney(r.received)} • Saldo {fmtMoney(r.balance)}
                    {r.due_date && ` • vence ${fmtDate(r.due_date)}`}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={async () => {
                  const value = Number(prompt("Valor recebido (R$):", String(r.balance.toFixed(2))) ?? "0");
                  if (!Number.isFinite(value) || value <= 0) return;
                  const { error } = await supabase.from("receivable_payments")
                    .insert({ receivable_id: r.id, user_id: user!.id, amount: value } as any);
                  if (error) toast.error(error.message); else toast.success("Pagamento registrado");
                }}>
                  Receber
                </Button>
                <Button size="sm" variant="ghost" onClick={async () => {
                  const { error } = await supabase.from("receivables").delete().eq("id", r.id);
                  if (error) toast.error(error.message); else toast.success("Removido");
                }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function ReceberForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [debtor, setDebtor] = useState(""); const [amount, setAmount] = useState("");
  const [due, setDue] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("receivables").insert({
      user_id: userId, debtor_name: debtor, amount: Number(amount), due_date: due || null,
    } as any);
    if (error) toast.error(error.message); else { toast.success("Criado"); onDone(); }
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <div><Label>Devedor</Label><Input required value={debtor} onChange={(e) => setDebtor(e.target.value)} /></div>
      <div><Label>Valor (R$)</Label><Input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
      <div><Label>Vencimento (opcional)</Label><DatePicker value={due} onChange={setDue} allowClear placeholder="Sem vencimento" /></div>
      <Button type="submit" className="w-full">Salvar</Button>
    </form>
  );
}
