import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useRealtimeQuery } from "@/lib/data-hooks";
import { fmtMoney, fmtDate, todayISO, parseLocalDate } from "@/lib/finance";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Trash2, HandCoins, Check } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/icon-picker";
import { CategoryManagerTrigger } from "@/components/category-manager";

export const Route = createFileRoute("/_app/transacoes")({
  component: TransacoesPage,
});

function TransacoesPage() {
  return (
    <div className="px-6 md:px-10 py-8 max-w-[1200px] mx-auto">
      <div className="mb-6 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transações</h1>
          <p className="text-muted-foreground text-sm mt-1">Receitas, despesas e valores a receber</p>
        </div>
        <CategoryManagerTrigger />
      </div>

      <Tabs defaultValue="lancamentos">
        <TabsList>
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="receber">A receber</TabsTrigger>
        </TabsList>

        <TabsContent value="lancamentos" className="mt-6">
          <LancamentosTab />
        </TabsContent>

        <TabsContent value="receber" className="mt-6">
          <ReceberTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LancamentosTab() {
  const { user } = useAuth();
  const { data: txs } = useRealtimeQuery("transactions", user?.id, (q) =>
    q.order("date", { ascending: false }).limit(200)
  );
  const { data: cats } = useRealtimeQuery("categories", user?.id);
  const [open, setOpen] = useState(false);
  const [paying, setPaying] = useState<any | null>(null);

  const remove = async (id: string) => {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) toast.error(error.message); else toast.success("Removido");
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> Nova</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova transação</DialogTitle></DialogHeader>
            <TxForm cats={cats} userId={user!.id} onDone={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-soft overflow-hidden">
        {txs.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Nenhuma transação. Clique em <b>Nova</b> para começar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground bg-muted/40">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Descrição</th>
                  <th className="text-left px-3 py-3 font-medium">Categoria</th>
                  <th className="text-right px-4 py-3 font-medium w-32">Valor</th>
                  <th className="text-center px-4 py-3 font-medium w-32">Data</th>
                  <th className="text-center px-4 py-3 font-medium w-32">Vencimento</th>
                  <th className="text-center px-4 py-3 font-medium w-24">Status</th>
                  <th className="px-3 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {txs.map((t: any) => {
                  const cat = cats.find((c: any) => c.id === t.category_id);
                  const isPaid = t.is_paid !== false;
                  const paid = Number(t.paid_amount ?? 0);
                  const original = Number(t.amount ?? 0);
                  const diff = paid && isPaid ? paid - original : 0;
                  return (
                    <tr key={t.id} className="hover:bg-muted/30">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: (cat?.color ?? "#94a3b8") + "1a", color: cat?.color ?? "#94a3b8" }}
                          >
                            <CategoryIcon name={cat?.icon} className="h-3.5 w-3.5" />
                          </span>
                          <span className="truncate">{t.description ?? cat?.name ?? "Lançamento"}</span>
                          {t.is_installment ? (
                            <span className="text-[10px] uppercase text-muted-foreground">{t.installment_index}/x</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{cat?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`tabular font-medium ${t.kind === "income" ? "text-success" : "text-foreground"}`}>
                          {t.kind === "income" ? "+" : "−"} {fmtMoney(t.amount)}
                        </span>
                        {diff !== 0 && (
                          <p className={`text-[10px] tabular ${diff > 0 ? "text-destructive" : "text-success"}`}>
                            pago {fmtMoney(paid)}{diff > 0 ? ` (+${fmtMoney(diff)})` : ` (${fmtMoney(diff)})`}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center tabular text-muted-foreground">{fmtDate(t.date)}</td>
                      <td className="px-4 py-3 text-center tabular text-muted-foreground">{fmtDate(t.due_date)}</td>
                      <td className="px-4 py-3 text-center">
                        {t.kind === "expense" && t.due_date ? (
                          isPaid ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">
                              <Check className="h-3 w-3" /> Pago
                            </span>
                          ) : (
                            <Button size="sm" variant="outline" className="h-7" onClick={() => setPaying(t)}>
                              <Check className="h-3 w-3 mr-1" /> Pagar
                            </Button>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
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
      </Card>

      {paying && (
        <PayDialog tx={paying} onClose={() => setPaying(null)} />
      )}
    </>
  );
}

function PayDialog({ tx, onClose }: { tx: any; onClose: () => void }) {
  const [amount, setAmount] = useState(String(Number(tx.amount).toFixed(2)));
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) { setBusy(false); return toast.error("Valor inválido"); }
    const { error } = await supabase.from("transactions")
      .update({ is_paid: true, paid_amount: value } as any)
      .eq("id", tx.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Pagamento registrado"); onClose(); }
  };

  const original = Number(tx.amount);
  const value = Number(amount) || 0;
  const diff = value - original;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Confirmar pagamento</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="rounded-lg bg-muted/40 p-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Valor original</span><span className="tabular font-medium">{fmtMoney(original)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Vence em</span><span className="tabular">{fmtDate(tx.due_date)}</span></div>
          </div>
          <div className="space-y-2">
            <Label>Valor pago (R$)</Label>
            <Input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Diferente do original? Informe o valor real (juros/multa/desconto).
            </p>
            {diff !== 0 && (
              <p className={`text-xs tabular ${diff > 0 ? "text-destructive" : "text-success"}`}>
                {diff > 0 ? `+ ${fmtMoney(diff)} de juros/multa` : `${fmtMoney(diff)} de desconto`}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Salvando..." : "Confirmar pagamento"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TxForm({ cats, userId, onDone }: { cats: any[]; userId: string; onDone: () => void }) {
  const { data: cards } = useRealtimeQuery("credit_cards", userId);
  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [method, setMethod] = useState<"cash" | "card">("cash");
  const [cardId, setCardId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const filtered = cats.filter((c: any) => c.kind === kind);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (kind === "expense" && method === "card" && !cardId) {
      toast.error("Selecione qual cartão foi usado");
      return;
    }
    setBusy(true);
    const isCardExpense = kind === "expense" && method === "card";
    const { error } = await supabase.from("transactions").insert({
      user_id: userId, kind, amount: Number(amount), date,
      due_date: dueDate || null,
      description: description || null,
      category_id: categoryId || null,
      card_id: isCardExpense ? cardId : null,
      // Despesa no cartão entra como pendente até a fatura ser paga.
      // Despesa com vencimento à vista também começa pendente.
      // Receitas/sem vencimento como pagas.
      is_paid: kind === "expense" && (isCardExpense || dueDate) ? false : true,
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Valor (R$)</Label>
          <Input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
        </div>
        <div className="space-y-2">
          <Label>Data do lançamento</Label>
          <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      {kind === "expense" && (
        <div className="space-y-2">
          <Label>Data de vencimento (opcional)</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <p className="text-xs text-muted-foreground">Se preencher, a despesa entra como pendente até você confirmar o pagamento.</p>
        </div>
      )}

      <div className="space-y-2">
        <Label>Categoria</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
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
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Salvando..." : "Salvar"}</Button>
    </form>
  );
}

/* ============ A receber tab (with partial payments) ============ */

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
          <p className="text-xs text-muted-foreground">Saldo a receber</p>
          <p className="text-2xl font-semibold tabular mt-1">{fmtMoney(pending)}</p>
        </Card>
        <Card className="p-5 shadow-soft">
          <p className="text-xs text-muted-foreground">Já recebido</p>
          <p className="text-2xl font-semibold tabular mt-1 text-success">{fmtMoney(received)}</p>
        </Card>
      </div>

      <div className="flex justify-end mb-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1.5" /> Novo a receber</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo a receber</DialogTitle></DialogHeader>
            <NewReceivableForm userId={user!.id} onDone={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {enriched.length === 0 ? (
        <Card className="p-12 text-center shadow-soft">
          <HandCoins className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Nada registrado.</p>
        </Card>
      ) : (
        <Card className="shadow-soft overflow-hidden">
          <ul className="divide-y divide-border">
            {enriched.map((it) => <ReceivableRow key={it.id} item={it} userId={user!.id} />)}
          </ul>
        </Card>
      )}
    </>
  );
}

function ReceivableRow({ item, userId }: { item: any; userId: string }) {
  const [openPay, setOpenPay] = useState(false);
  const isPaid = item.balance <= 0.009;
  const pct = item.amount > 0 ? Math.min((item.received / Number(item.amount)) * 100, 100) : 0;

  return (
    <li className="px-5 py-4">
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{item.debtor_name}</p>
          <p className="text-xs text-muted-foreground">
            {item.due_date ? `Vence ${fmtDate(item.due_date)}` : "Sem prazo"}
            {item.notes ? ` • ${item.notes}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="tabular font-medium text-sm">{fmtMoney(item.balance)}</p>
          <p className="text-xs text-muted-foreground tabular">de {fmtMoney(item.amount)}</p>
        </div>
        {!isPaid ? (
          <Dialog open={openPay} onOpenChange={setOpenPay}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">Receber</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar recebimento</DialogTitle></DialogHeader>
              <PartialPaymentForm receivableId={item.id} userId={userId} maxAmount={item.balance} onDone={() => setOpenPay(false)} />
            </DialogContent>
          </Dialog>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success flex items-center gap-1">
            <Check className="h-3 w-3" /> Pago
          </span>
        )}
      </div>
      <div className="h-1 bg-secondary rounded-full mt-3 overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      {item.payments.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {item.payments.map((p: any) => (
            <li key={p.id} className="text-xs text-muted-foreground tabular flex justify-between">
              <span>↳ {fmtDate(p.paid_at)}{p.notes ? ` • ${p.notes}` : ""}</span>
              <span className="text-success">+ {fmtMoney(p.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function PartialPaymentForm({ receivableId, userId, maxAmount, onDone }: { receivableId: string; userId: string; maxAmount: number; onDone: () => void }) {
  const [amount, setAmount] = useState(maxAmount.toFixed(2));
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (value <= 0) { toast.error("Valor inválido"); return; }
    const { error } = await supabase.from("receivable_payments").insert({
      user_id: userId, receivable_id: receivableId, amount: value, paid_at: date, notes: notes || null,
    } as any);
    if (error) { toast.error(error.message); return; }
    if (value >= maxAmount - 0.009) {
      await supabase.from("receivables").update({ status: "paid" } as any).eq("id", receivableId);
    }
    toast.success("Recebimento registrado");
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div><Label>Valor recebido (R$)</Label><Input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
      <p className="text-xs text-muted-foreground">Saldo devedor: {fmtMoney(maxAmount)}</p>
      <div><Label>Data</Label><Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></div>
      <div><Label>Observação (opcional)</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      <Button type="submit" className="w-full">Salvar</Button>
    </form>
  );
}

function NewReceivableForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [name, setName] = useState(""); const [amount, setAmount] = useState("");
  const [due, setDue] = useState(""); const [notes, setNotes] = useState("");
  void parseLocalDate; // keep import used in some builds

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("receivables").insert({
      user_id: userId, debtor_name: name, amount: Number(amount),
      due_date: due || null, notes: notes || null, status: "pending",
    } as any);
    if (error) toast.error(error.message); else { toast.success("Adicionado"); onDone(); }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div><Label>Quem deve</Label><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="João" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Valor (R$)</Label><Input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <div><Label>Prazo (opcional)</Label><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
      </div>
      <div><Label>Observações</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      <Button type="submit" className="w-full">Salvar</Button>
    </form>
  );
}
