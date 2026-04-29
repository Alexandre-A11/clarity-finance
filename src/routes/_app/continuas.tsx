import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useRealtimeQuery } from "@/lib/data-hooks";
import { fmtMoney } from "@/lib/finance";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Repeat } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/continuas")({
  component: ContinuasPage,
});

function ContinuasPage() {
  const { user } = useAuth();
  const { data: items } = useRealtimeQuery("ongoing_expenses", user?.id);
  const [open, setOpen] = useState(false);

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Despesas contínuas</h1>
          <p className="text-muted-foreground text-sm mt-1">Financiamentos, consórcios, compras longas</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1.5" /> Nova</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova despesa contínua</DialogTitle></DialogHeader>
            <Form userId={user!.id} onDone={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <Card className="p-12 text-center shadow-soft">
          <Repeat className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma despesa contínua registrada.</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {items.map((it: any) => {
            const remaining = it.months_total - it.months_paid;
            const pctMonths = (it.months_paid / it.months_total) * 100;
            const remainingValue = Number(it.total_amount) - Number(it.paid_amount);
            return (
              <Card key={it.id} className="p-5 shadow-soft">
                <p className="font-medium">{it.description}</p>
                <p className="text-2xl font-semibold tabular mt-2">{fmtMoney(remainingValue)}</p>
                <p className="text-xs text-muted-foreground tabular">saldo devedor • {fmtMoney(it.monthly_value)}/mês</p>
                <div className="h-1.5 bg-secondary rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${pctMonths}%` }} />
                </div>
                <p className="text-xs text-muted-foreground tabular mt-2">{it.months_paid}/{it.months_total} pagas • {remaining} restantes</p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Form({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [desc, setDesc] = useState(""); const [total, setTotal] = useState("");
  const [paid, setPaid] = useState("0"); const [months, setMonths] = useState("");
  const [monthsPaid, setMonthsPaid] = useState("0"); const [monthly, setMonthly] = useState("");
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("ongoing_expenses").insert({
      user_id: userId, description: desc, total_amount: Number(total),
      paid_amount: Number(paid), months_total: Number(months),
      months_paid: Number(monthsPaid), monthly_value: Number(monthly), start_date: start,
    } as any);
    if (error) toast.error(error.message); else { toast.success("Adicionado"); onDone(); }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div><Label>Descrição</Label><Input required value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Consórcio carro" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Valor total (R$)</Label><Input type="number" step="0.01" required value={total} onChange={(e) => setTotal(e.target.value)} /></div>
        <div><Label>Pago até hoje</Label><Input type="number" step="0.01" value={paid} onChange={(e) => setPaid(e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Meses total</Label><Input type="number" required value={months} onChange={(e) => setMonths(e.target.value)} /></div>
        <div><Label>Meses pagos</Label><Input type="number" value={monthsPaid} onChange={(e) => setMonthsPaid(e.target.value)} /></div>
      </div>
      <div><Label>Parcela mensal (R$)</Label><Input type="number" step="0.01" required value={monthly} onChange={(e) => setMonthly(e.target.value)} /></div>
      <div><Label>Início</Label><Input type="date" required value={start} onChange={(e) => setStart(e.target.value)} /></div>
      <Button type="submit" className="w-full">Salvar</Button>
    </form>
  );
}
