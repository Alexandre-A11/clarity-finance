import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useRealtimeQuery } from "@/lib/data-hooks";
import { fmtMoney } from "@/lib/finance";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ArrowDownRight, ArrowUpRight, Trash2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/transacoes")({
  component: TransacoesPage,
});

function TransacoesPage() {
  const { user } = useAuth();
  const { data: txs } = useRealtimeQuery("transactions", user?.id, (q) =>
    q.order("date", { ascending: false }).limit(200)
  );
  const { data: cats } = useRealtimeQuery("categories", user?.id);
  const [open, setOpen] = useState(false);

  const remove = async (id: string) => {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Removido");
  };

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transações</h1>
          <p className="text-muted-foreground text-sm mt-1">Receitas e despesas</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1.5" /> Nova</Button>
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
          <ul className="divide-y divide-border">
            {txs.map((t: any) => {
              const cat = cats.find((c: any) => c.id === t.category_id);
              return (
                <li key={t.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/40 transition-colors">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: (cat?.color ?? "#94a3b8") + "1a", color: cat?.color ?? "#94a3b8" }}>
                    {t.kind === "income" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{t.description ?? cat?.name ?? "Lançamento"}</p>
                    <p className="text-xs text-muted-foreground">{cat?.name ?? "—"} • {new Date(t.date).toLocaleDateString("pt-BR")}{t.is_installment ? ` • parcela ${t.installment_index}` : ""}</p>
                  </div>
                  <span className={`tabular font-medium text-sm ${t.kind === "income" ? "text-success" : "text-foreground"}`}>
                    {t.kind === "income" ? "+" : "−"} {fmtMoney(t.amount)}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => remove(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function TxForm({ cats, userId, onDone }: { cats: any[]; userId: string; onDone: () => void }) {
  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const filtered = cats.filter((c: any) => c.kind === kind);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("transactions").insert({
      user_id: userId, kind, amount: Number(amount), date, description: description || null,
      category_id: categoryId || null,
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
      <div className="space-y-2">
        <Label>Valor (R$)</Label>
        <Input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Data</Label>
        <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
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
