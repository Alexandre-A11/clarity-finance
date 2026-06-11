import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useRealtimeQuery } from "@/lib/data-hooks";
import { fmtMoney, fmtDate, fmtElapsedSince } from "@/lib/finance";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Repeat, CalendarClock, Trash2, Landmark, FileText, CreditCard, Zap } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DatePicker } from "@/components/date-picker";

export const Route = createFileRoute("/_app/continuas")({
  component: ContinuasPage,
});

type PayMethod = "debito_automatico" | "boleto" | "credito" | "pix";

const PAY_METHODS: { value: PayMethod; label: string; icon: typeof Landmark }[] = [
  { value: "debito_automatico", label: "Débito Automático", icon: Landmark },
  { value: "boleto", label: "Boleto", icon: FileText },
  { value: "credito", label: "Cartão de Crédito", icon: CreditCard },
  { value: "pix", label: "Pix", icon: Zap },
];

function payMethodMeta(m: PayMethod) {
  return PAY_METHODS.find((p) => p.value === m) ?? PAY_METHODS[1];
}

function ContinuasPage() {
  const { user } = useAuth();
  const { data: items } = useRealtimeQuery("ongoing_expenses", user?.id);
  const { data: cards } = useRealtimeQuery("credit_cards", user?.id);

  const subscriptions = items.filter((i: any) => i.kind === "subscription");
  const installments = items.filter((i: any) => i.kind !== "subscription");

  const monthlySubs = subscriptions.reduce((s: number, i: any) => s + Number(i.monthly_value), 0);
  const monthlyInst = installments.reduce((s: number, i: any) => s + Number(i.monthly_value), 0);

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1100px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Despesas fixas</h1>
        <p className="text-muted-foreground text-sm mt-1">Assinaturas mensais e parcelamentos com fim previsto</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="p-5 shadow-soft">
          <p className="text-xs text-muted-foreground">Assinaturas / mês</p>
          <p className="text-2xl font-semibold tabular mt-1">{fmtMoney(monthlySubs)}</p>
        </Card>
        <Card className="p-5 shadow-soft">
          <p className="text-xs text-muted-foreground">Parcelamentos / mês</p>
          <p className="text-2xl font-semibold tabular mt-1">{fmtMoney(monthlyInst)}</p>
        </Card>
      </div>

      <Tabs defaultValue="subscriptions">
        <TabsList>
          <TabsTrigger value="subscriptions">
            <Repeat className="h-3.5 w-3.5 mr-1.5" /> Assinaturas
          </TabsTrigger>
          <TabsTrigger value="installments">
            <CalendarClock className="h-3.5 w-3.5 mr-1.5" /> Parcelamentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="mt-6">
          <SectionHeader
            title="Assinaturas e recorrentes"
            subtitle="Streaming, apps, mensalidades — sem data de fim"
            kind="subscription"
            userId={user!.id}
            cards={cards}
          />
          {subscriptions.length === 0 ? (
            <EmptyCard message="Nenhuma assinatura cadastrada." />
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {subscriptions.map((it: any) => <SubscriptionCard key={it.id} item={it} cards={cards} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="installments" className="mt-6">
          <SectionHeader
            title="Parcelamentos e financiamentos"
            subtitle="Consórcios, compras parceladas — com data de fim"
            kind="installment"
            userId={user!.id}
            cards={cards}
          />
          {installments.length === 0 ? (
            <EmptyCard message="Nenhum parcelamento cadastrado." />
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {installments.map((it: any) => <InstallmentCard key={it.id} item={it} cards={cards} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PayMethodTag({ item, cards }: { item: any; cards: any[] }) {
  const meta = payMethodMeta((item.payment_method ?? "boleto") as PayMethod);
  const Icon = meta.icon;
  const card = item.credit_card_id ? cards.find((c: any) => c.id === item.credit_card_id) : null;
  const label = meta.value === "credito" && card ? `Cartão ${card.name}` : meta.label;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border">
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <Card className="p-12 text-center shadow-soft">
      <Repeat className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </Card>
  );
}

function SectionHeader({ title, subtitle, kind, userId, cards }: { title: string; subtitle: string; kind: "subscription" | "installment"; userId: string; cards: any[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> Nova</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{kind === "subscription" ? "Nova assinatura" : "Novo parcelamento"}</DialogTitle>
          </DialogHeader>
          <Form kind={kind} userId={userId} cards={cards} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

async function removeOne(id: string) {
  const { error } = await supabase.from("ongoing_expenses").delete().eq("id", id);
  if (error) toast.error(error.message); else toast.success("Removido");
}

function SubscriptionCard({ item, cards }: { item: any; cards: any[] }) {
  const elapsed = fmtElapsedSince(item.start_date);
  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{item.description}</p>
          <p className="text-2xl font-semibold tabular mt-2">{fmtMoney(item.monthly_value)}</p>
          <p className="text-xs text-muted-foreground tabular">por mês{item.due_day ? ` • vence dia ${item.due_day}` : ""}</p>
          <div className="mt-2"><PayMethodTag item={item} cards={cards} /></div>
          {item.start_date && elapsed && (
            <p className="text-[10px] text-muted-foreground/70 mt-3">
              Assinante desde {fmtDate(item.start_date)} • {elapsed}
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => removeOne(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    </Card>
  );
}


function InstallmentCard({ item, cards }: { item: any; cards: any[] }) {
  const total = Number(item.total_amount ?? 0);
  const paid = Number(item.paid_amount ?? 0);
  const remaining = total - paid;
  const monthsTotal = Number(item.months_total ?? 0);
  const monthsPaid = Number(item.months_paid ?? 0);
  const pct = monthsTotal > 0 ? (monthsPaid / monthsTotal) * 100 : 0;
  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-medium">{item.description}</p>
          <p className="text-2xl font-semibold tabular mt-2">{fmtMoney(remaining)}</p>
          <p className="text-xs text-muted-foreground tabular">saldo devedor • {fmtMoney(item.monthly_value)}/mês</p>
          <div className="h-1.5 bg-secondary rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground tabular mt-2">
            {monthsPaid}/{monthsTotal} pagas • {monthsTotal - monthsPaid} restantes
          </p>
          <div className="mt-2"><PayMethodTag item={item} cards={cards} /></div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => removeOne(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    </Card>
  );
}

function Form({ kind, userId, cards, onDone }: { kind: "subscription" | "installment"; userId: string; cards: any[]; onDone: () => void }) {
  const [desc, setDesc] = useState("");
  const [monthly, setMonthly] = useState("");
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [dueDay, setDueDay] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PayMethod>("boleto");
  const [creditCardId, setCreditCardId] = useState<string>("");
  // installment-only
  const [total, setTotal] = useState("");
  const [paid, setPaid] = useState("0");
  const [months, setMonths] = useState("");
  const [monthsPaid, setMonthsPaid] = useState("0");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMethod === "credito" && !creditCardId) {
      toast.error("Selecione o cartão de crédito");
      return;
    }
    const payload: any = {
      user_id: userId,
      kind,
      description: desc,
      monthly_value: Number(monthly),
      start_date: start,
      due_day: dueDay ? Number(dueDay) : null,
      payment_method: paymentMethod,
      credit_card_id: paymentMethod === "credito" ? creditCardId : null,
    };
    if (kind === "installment") {
      payload.total_amount = Number(total);
      payload.paid_amount = Number(paid);
      payload.months_total = Number(months);
      payload.months_paid = Number(monthsPaid);
    } else {
      payload.total_amount = null;
      payload.months_total = null;
    }
    const { error } = await supabase.from("ongoing_expenses").insert(payload);
    if (error) toast.error(error.message); else { toast.success("Adicionado"); onDone(); }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <Label>Descrição</Label>
        <Input required value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={kind === "subscription" ? "Netflix, Spotify..." : "Consórcio carro, financiamento..."} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Valor mensal (R$)</Label><Input type="number" step="0.01" required value={monthly} onChange={(e) => setMonthly(e.target.value)} /></div>
        <div><Label>Vence dia</Label><Input type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} placeholder="Ex: 10" /></div>
      </div>

      <div>
        <Label>Forma de pagamento</Label>
        <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PayMethod)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {PAY_METHODS.map((m) => {
              const Icon = m.icon;
              return (
                <SelectItem key={m.value} value={m.value}>
                  <span className="inline-flex items-center gap-2"><Icon className="h-3.5 w-3.5" /> {m.label}</span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {paymentMethod === "credito" && (
        <div>
          <Label>Cartão</Label>
          <Select value={creditCardId} onValueChange={setCreditCardId}>
            <SelectTrigger><SelectValue placeholder="Selecione um cartão" /></SelectTrigger>
            <SelectContent>
              {cards.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum cartão cadastrado</div>
              ) : cards.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {kind === "installment" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Valor total (R$)</Label><Input type="number" step="0.01" required value={total} onChange={(e) => setTotal(e.target.value)} /></div>
            <div><Label>Já pago (R$)</Label><Input type="number" step="0.01" value={paid} onChange={(e) => setPaid(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Meses total</Label><Input type="number" required value={months} onChange={(e) => setMonths(e.target.value)} /></div>
            <div><Label>Meses pagos</Label><Input type="number" value={monthsPaid} onChange={(e) => setMonthsPaid(e.target.value)} /></div>
          </div>
        </>
      )}

      <div><Label>Início</Label><DatePicker value={start} onChange={setStart} /></div>
      <Button type="submit" className="w-full">Salvar</Button>
    </form>
  );
}
