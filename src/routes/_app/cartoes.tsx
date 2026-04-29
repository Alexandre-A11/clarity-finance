import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useRealtimeQuery } from "@/lib/data-hooks";
import { fmtMoney, installmentDates } from "@/lib/finance";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, CreditCard as CardIcon } from "lucide-react";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/cartoes")({
  component: CartoesPage,
});

function CartoesPage() {
  const { user } = useAuth();
  const { data: cards } = useRealtimeQuery("credit_cards", user?.id);
  const { data: txs } = useRealtimeQuery("transactions", user?.id);
  const { data: installments } = useRealtimeQuery("installment_purchases", user?.id);
  const { data: cats } = useRealtimeQuery("categories", user?.id);

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cartões de crédito</h1>
          <p className="text-muted-foreground text-sm mt-1">Limite, fatura e parcelas</p>
        </div>
        <div className="flex gap-2">
          <NewCardDialog userId={user!.id} />
          {cards.length > 0 && <NewInstallmentDialog cards={cards} cats={cats} userId={user!.id} />}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {cards.length === 0 ? (
          <Card className="p-12 text-center sm:col-span-2 shadow-soft">
            <CardIcon className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Cadastre seu primeiro cartão.</p>
          </Card>
        ) : cards.map((c: any) => {
          const used = txs.filter((t: any) => t.card_id === c.id).reduce((s: number, t: any) => s + Number(t.amount), 0);
          const pct = c.limit_total > 0 ? (used / Number(c.limit_total)) * 100 : 0;
          return (
            <Card key={c.id} className="p-5 shadow-soft">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">{c.brand ?? "Cartão"}</p>
                  <p className="font-medium mt-0.5">{c.name}</p>
                </div>
                <div className="h-8 w-12 rounded" style={{ background: c.color }} />
              </div>
              <p className="text-2xl font-semibold tabular">{fmtMoney(used)}</p>
              <p className="text-xs text-muted-foreground tabular">de {fmtMoney(c.limit_total)} • {pct.toFixed(0)}%</p>
              <div className="h-1.5 bg-secondary rounded-full mt-3 overflow-hidden">
                <div className="h-full" style={{ width: `${Math.min(pct, 100)}%`, background: pct > 80 ? "var(--destructive)" : "var(--primary)" }} />
              </div>
              <p className="text-xs text-muted-foreground mt-3">Fecha dia {c.closing_day} • vence dia {c.due_day}</p>
            </Card>
          );
        })}
      </div>

      {installments.length > 0 && (
        <div>
          <h2 className="text-sm font-medium mb-3">Compras parceladas</h2>
          <Card className="shadow-soft overflow-hidden">
            <ul className="divide-y divide-border">
              {installments.map((p: any) => {
                const card = cards.find((c: any) => c.id === p.card_id);
                const paid = txs.filter((t: any) => t.installment_purchase_id === p.id && new Date(t.date) <= new Date()).length;
                const remaining = p.installments_total - paid;
                const monthly = Number(p.total_amount) / p.installments_total;
                return (
                  <li key={p.id} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium">{p.description}</p>
                        <p className="text-xs text-muted-foreground">{card?.name} • {fmtMoney(monthly)}/mês</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold tabular">{paid}/{p.installments_total}</span>
                        <p className="text-xs text-muted-foreground">{remaining} restantes</p>
                      </div>
                    </div>
                    <div className="h-1 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${(paid / p.installments_total) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}

function NewCardDialog({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(""); const [brand, setBrand] = useState("");
  const [limit, setLimit] = useState(""); const [closing, setClosing] = useState("1"); const [due, setDue] = useState("10");
  const [color, setColor] = useState("#3b82f6");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("credit_cards").insert({
      user_id: userId, name, brand: brand || null, limit_total: Number(limit),
      closing_day: Number(closing), due_day: Number(due), color,
    } as any);
    if (error) toast.error(error.message); else { toast.success("Cartão criado"); setOpen(false); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline"><Plus className="h-4 w-4 mr-1.5" /> Cartão</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo cartão</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Nome</Label><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nubank" /></div>
          <div><Label>Bandeira</Label><Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Mastercard" /></div>
          <div><Label>Limite (R$)</Label><Input type="number" step="0.01" required value={limit} onChange={(e) => setLimit(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Fecha dia</Label><Input type="number" min="1" max="31" required value={closing} onChange={(e) => setClosing(e.target.value)} /></div>
            <div><Label>Vence dia</Label><Input type="number" min="1" max="31" required value={due} onChange={(e) => setDue(e.target.value)} /></div>
          </div>
          <div><Label>Cor</Label><Input type="color" value={color} onChange={(e) => setColor(e.target.value)} /></div>
          <Button type="submit" className="w-full">Salvar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewInstallmentDialog({ cards, cats, userId }: { cards: any[]; cats: any[]; userId: string }) {
  const [open, setOpen] = useState(false);
  const [cardId, setCardId] = useState(""); const [desc, setDesc] = useState("");
  const [total, setTotal] = useState(""); const [n, setN] = useState("12");
  const [first, setFirst] = useState(new Date().toISOString().slice(0, 10));
  const [catId, setCatId] = useState("");
  const expenseCats = useMemo(() => cats.filter((c) => c.kind === "expense"), [cats]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: purchase, error } = await supabase.from("installment_purchases").insert({
      user_id: userId, card_id: cardId, description: desc, total_amount: Number(total),
      installments_total: Number(n), first_date: first, category_id: catId || null,
    } as any).select().single();
    if (error || !purchase) { toast.error(error?.message ?? "Erro"); return; }
    const dates = installmentDates(first, Number(n));
    const monthly = Number(total) / Number(n);
    const rows = dates.map((d, i) => ({
      user_id: userId, card_id: cardId, category_id: catId || null,
      date: d, amount: monthly, kind: "expense" as const, description: `${desc} (${i + 1}/${n})`,
      is_installment: true, installment_purchase_id: (purchase as any).id, installment_index: i + 1,
    }));
    const { error: e2 } = await supabase.from("transactions").insert(rows as any);
    if (e2) toast.error(e2.message); else { toast.success(`${n} parcelas geradas`); setOpen(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1.5" /> Compra parcelada</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Compra parcelada</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Cartão</Label>
            <Select value={cardId} onValueChange={setCardId} required>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{cards.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Descrição</Label><Input required value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Notebook" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Total (R$)</Label><Input type="number" step="0.01" required value={total} onChange={(e) => setTotal(e.target.value)} /></div>
            <div><Label>Nº parcelas</Label><Input type="number" min="1" max="60" required value={n} onChange={(e) => setN(e.target.value)} /></div>
          </div>
          <div><Label>Data 1ª parcela</Label><Input type="date" required value={first} onChange={(e) => setFirst(e.target.value)} /></div>
          <div>
            <Label>Categoria</Label>
            <Select value={catId} onValueChange={setCatId}>
              <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
              <SelectContent>{expenseCats.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {total && n && <p className="text-xs text-muted-foreground">{n}× de {fmtMoney(Number(total) / Number(n))}</p>}
          <Button type="submit" className="w-full">Gerar parcelas</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
