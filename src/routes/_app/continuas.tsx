import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useRealtimeQuery } from "@/lib/data-hooks";
import { fmtMoney } from "@/lib/finance";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Repeat, CalendarClock, Trash2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/continuas")({
  component: ContinuasPage,
});

function ContinuasPage() {
  const { user } = useAuth();
  const { data: items } = useRealtimeQuery("ongoing_expenses", user?.id);

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
          />
          {subscriptions.length === 0 ? (
            <EmptyCard message="Nenhuma assinatura cadastrada." />
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {subscriptions.map((it: any) => <SubscriptionCard key={it.id} item={it} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="installments" className="mt-6">
          <SectionHeader
            title="Parcelamentos e financiamentos"
            subtitle="Consórcios, compras parceladas — com data de fim"
            kind="installment"
            userId={user!.id}
          />
          {installments.length === 0 ? (
            <EmptyCard message="Nenhum parcelamento cadastrado." />
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {installments.map((it: any) => <InstallmentCard key={it.id} item={it} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
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

function SectionHeader({ title, subtitle, kind, userId }: { title: string; subtitle: string; kind: "subscription" | "installment"; userId: string }) {
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
          <Form kind={kind} userId={userId} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

async function removeOne(id: string) {
  const { error } = await supabase.from("ongoing_expenses").delete().eq("id", id);
  if (error) toast.error(error.message); else toast.success("Removido");
}

function SubscriptionCard({ item }: { item: any }) {
  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{item.description}</p>
          <p className="text-2xl font-semibold tabular mt-2">{fmtMoney(item.monthly_value)}</p>
          <p className="text-xs text-muted-foreground tabular">por mês{item.due_day ? ` • vence dia ${item.due_day}` : ""}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => removeOne(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    </Card>
  );
}

function InstallmentCard({ item }: { item: any }) {
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
        </div>
        <Button variant="ghost" size="sm" onClick={() => removeOne(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    </Card>
  );
}

function Form({ kind, userId, onDone }: { kind: "subscription" | "installment"; userId: string; onDone: () => void }) {
  const [desc, setDesc] = useState("");
  const [monthly, setMonthly] = useState("");
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [dueDay, setDueDay] = useState("");
  // installment-only
  const [total, setTotal] = useState("");
  const [paid, setPaid] = useState("0");
  const [months, setMonths] = useState("");
  const [monthsPaid, setMonthsPaid] = useState("0");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      user_id: userId,
      kind,
      description: desc,
      monthly_value: Number(monthly),
      start_date: start,
      due_day: dueDay ? Number(dueDay) : null,
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

      <div><Label>Início</Label><Input type="date" required value={start} onChange={(e) => setStart(e.target.value)} /></div>
      <Button type="submit" className="w-full">Salvar</Button>
    </form>
  );
}
