import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useRealtimeQuery } from "@/lib/data-hooks";
import { fmtMoney } from "@/lib/finance";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, HandCoins, Check } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/a-receber")({
  component: ReceberPage,
});

function ReceberPage() {
  const { user } = useAuth();
  const { data: items } = useRealtimeQuery("receivables", user?.id);
  const [open, setOpen] = useState(false);

  const markPaid = async (id: string) => {
    const { error } = await supabase.from("receivables").update({ status: "paid" } as any).eq("id", id);
    if (error) toast.error(error.message); else toast.success("Marcado como recebido");
  };

  const totals = {
    pending: items.filter((i: any) => i.status === "pending").reduce((s: number, i: any) => s + Number(i.amount), 0),
    paid: items.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + Number(i.amount), 0),
  };

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">A receber</h1>
          <p className="text-muted-foreground text-sm mt-1">Empréstimos e valores a receber</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1.5" /> Novo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo a receber</DialogTitle></DialogHeader>
            <Form userId={user!.id} onDone={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="p-5 shadow-soft">
          <p className="text-xs text-muted-foreground">Pendente</p>
          <p className="text-2xl font-semibold tabular mt-1">{fmtMoney(totals.pending)}</p>
        </Card>
        <Card className="p-5 shadow-soft">
          <p className="text-xs text-muted-foreground">Já recebido</p>
          <p className="text-2xl font-semibold tabular mt-1 text-success">{fmtMoney(totals.paid)}</p>
        </Card>
      </div>

      {items.length === 0 ? (
        <Card className="p-12 text-center shadow-soft">
          <HandCoins className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Nada registrado.</p>
        </Card>
      ) : (
        <Card className="shadow-soft overflow-hidden">
          <ul className="divide-y divide-border">
            {items.map((it: any) => (
              <li key={it.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{it.debtor_name}</p>
                  <p className="text-xs text-muted-foreground">{it.due_date ? `Vence ${new Date(it.due_date).toLocaleDateString("pt-BR")}` : "Sem prazo"}{it.notes ? ` • ${it.notes}` : ""}</p>
                </div>
                <span className="tabular font-medium">{fmtMoney(it.amount)}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  it.status === "paid" ? "bg-success/10 text-success" :
                  it.status === "overdue" ? "bg-destructive/10 text-destructive" :
                  "bg-warning/10 text-warning-foreground"
                }`}>
                  {it.status === "paid" ? "Pago" : it.status === "overdue" ? "Atrasado" : "Pendente"}
                </span>
                {it.status !== "paid" && (
                  <Button variant="ghost" size="sm" onClick={() => markPaid(it.id)}><Check className="h-4 w-4" /></Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Form({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [name, setName] = useState(""); const [amount, setAmount] = useState("");
  const [due, setDue] = useState(""); const [notes, setNotes] = useState("");

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
      <div><Label>Valor (R$)</Label><Input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
      <div><Label>Prazo (opcional)</Label><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
      <div><Label>Observações</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      <Button type="submit" className="w-full">Salvar</Button>
    </form>
  );
}
