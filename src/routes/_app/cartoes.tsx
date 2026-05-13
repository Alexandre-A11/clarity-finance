import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useRealtimeQuery } from "@/lib/data-hooks";
import { fmtMoney, fmtDate, monthRange, parseLocalDate } from "@/lib/finance";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, CreditCard as CardIcon, Lock, Trash2, Receipt } from "lucide-react";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BrandSelect } from "@/components/brand-select";
import { ColorSwatchPicker } from "@/components/color-swatch-picker";
import { CreditCardVisual } from "@/components/credit-card-visual";
import { usePrivacy } from "@/lib/privacy-context";

export const Route = createFileRoute("/_app/cartoes")({
  component: CartoesPage,
});

function CartoesPage() {
  const { user } = useAuth();
  const { data: cards } = useRealtimeQuery("credit_cards", user?.id);
  const { data: txs } = useRealtimeQuery("transactions", user?.id);
  const { data: installments } = useRealtimeQuery("installment_purchases", user?.id);
  const { hidden } = usePrivacy();

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cartões de crédito</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Limite, fatura e parcelas. Lance gastos e pague faturas em <span className="font-medium text-foreground">Transações → Nova</span>.
          </p>
        </div>
        <NewCardDialog userId={user!.id} />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
        {cards.length === 0 ? (
          <Card className="p-12 text-center sm:col-span-2 lg:col-span-3 shadow-soft">
            <CardIcon className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Cadastre seu primeiro cartão.</p>
          </Card>
        ) : cards.map((c: any) => (
          <CardItem key={c.id} card={c} txs={txs} userId={user!.id} hidden={hidden} />
        ))}
      </div>

      {installments.length > 0 && (
        <div>
          <h2 className="text-sm font-medium mb-3">Compras parceladas</h2>
          <Card className="shadow-soft overflow-hidden">
            <ul className="divide-y divide-border">
              {installments.map((p: any) => {
                const card = cards.find((c: any) => c.id === p.card_id);
                const today = new Date();
                const paid = txs.filter((t: any) => {
                  const d = parseLocalDate(t.date);
                  return t.installment_purchase_id === p.id && d && d <= today;
                }).length;
                const remaining = p.installments_total - paid;
                const monthly = Number(p.total_amount) / p.installments_total;
                return (
                  <li key={p.id} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium">{p.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {card?.name ?? "Cartão removido"} • {fmtMoney(monthly)}/mês
                        </p>
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

function CardItem({ card: c, txs, userId, hidden }: { card: any; txs: any[]; userId: string; hidden: boolean }) {
  void userId;
  const { start, end } = useMemo(() => monthRange(new Date()), []);
  const invoiceTxs = useMemo(
    () => txs.filter((t: any) => t.card_id === c.id && t.date >= start && t.date <= end),
    [txs, c.id, start, end]
  );
  const invoiceTotal = invoiceTxs.reduce((s, t: any) => s + Number(t.amount), 0);
  const invoicePaidSum = invoiceTxs.filter((t: any) => t.is_paid === true).reduce((s, t: any) => s + Number(t.amount), 0);
  const invoicePending = invoiceTxs.filter((t: any) => t.is_paid === false).reduce((s, t: any) => s + Number(t.amount), 0);
  const invoiceFullyPaid = invoiceTxs.length > 0 && invoicePending < 0.01;

  // REACTIVE LIMIT: used = sum of UNPAID transactions only.
  // Paying the invoice flips is_paid → true, freeing the limit automatically.
  const used = txs
    .filter((t: any) => t.card_id === c.id && t.is_paid === false)
    .reduce((s, t: any) => s + Number(t.amount), 0);
  const pct = c.limit_total > 0 ? (used / Number(c.limit_total)) * 100 : 0;
  const available = Math.max(Number(c.limit_total) - used, 0);

  const removeCard = async () => {
    const { error } = await supabase.from("credit_cards").delete().eq("id", c.id);
    if (error) toast.error(error.message); else toast.success("Cartão removido");
  };

  const [showInvoice, setShowInvoice] = useState(false);

  return (
    <Card className="p-4 shadow-soft">
      <div className="mx-auto w-full max-w-[280px]">
        <CreditCardVisual
          name={c.name}
          brand={c.brand}
          color={c.color}
          holder={c.card_holder_name}
          lastFour={c.last_four_digits}
          hidden={hidden}
        />
      </div>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Utilizado</p>
          <p className="text-2xl font-semibold tabular">{fmtMoney(used)}</p>
          <p className="text-xs text-muted-foreground tabular">
            disponível {fmtMoney(available)} de {fmtMoney(c.limit_total)} • {pct.toFixed(0)}%
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir cartão {c.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                As transações antigas serão preservadas. Compras parceladas neste cartão e suas parcelas futuras serão excluídas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={removeCard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="h-1.5 bg-secondary rounded-full mt-3 overflow-hidden">
        <div className="h-full" style={{ width: `${Math.min(pct, 100)}%`, background: pct > 80 ? "var(--destructive)" : "var(--primary)" }} />
      </div>
      <p className="text-xs text-muted-foreground mt-3">Fecha dia {c.closing_day} • vence dia {c.due_day}</p>

      <div
        className={`mt-4 rounded-lg border p-3 ${
          invoiceFullyPaid
            ? "border-emerald-200 bg-emerald-50/60"
            : "border-border bg-muted/30"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-[11px] uppercase tracking-wider flex items-center gap-1 ${invoiceFullyPaid ? "text-emerald-700" : "text-muted-foreground"}`}>
              <Receipt className="h-3 w-3" /> {invoiceFullyPaid ? "Fatura paga" : "Fatura do mês"}
            </p>
            {invoiceFullyPaid ? (
              <>
                <p className="text-lg font-semibold tabular mt-0.5 text-emerald-700">{fmtMoney(0)}</p>
                <p className="text-xs text-emerald-700/80 tabular">
                  {invoiceTxs.length} lançamento(s) · pago {fmtMoney(invoicePaidSum)}
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold tabular mt-0.5">{fmtMoney(invoiceTotal)}</p>
                <p className="text-xs text-muted-foreground tabular">
                  {invoiceTxs.length} lançamento{invoiceTxs.length !== 1 ? "s" : ""} · pendente {fmtMoney(invoicePending)}
                </p>
              </>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowInvoice(true)}>
            Ver fatura
          </Button>
        </div>
      </div>

      <InvoiceDetailsDialog
        open={showInvoice}
        onOpenChange={setShowInvoice}
        card={c}
        invoiceTxs={invoiceTxs}
        invoiceTotal={invoiceTotal}
        invoicePending={invoicePending}
      />
    </Card>
  );
}

function InvoiceDetailsDialog({
  open, onOpenChange, card, invoiceTxs, invoiceTotal, invoicePending,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  card: any; invoiceTxs: any[]; invoiceTotal: number; invoicePending: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Fatura — {card.name}</DialogTitle></DialogHeader>
        <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">Total da fatura</span><span className="tabular font-medium">{fmtMoney(invoiceTotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Pendente</span><span className="tabular font-medium">{fmtMoney(invoicePending)}</span></div>
        </div>
        {invoiceTxs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum lançamento neste mês.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {invoiceTxs.map((t: any) => (
              <li key={t.id} className="py-2 flex justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate">{t.description ?? "Lançamento"}</p>
                  <p className="text-[11px] text-muted-foreground">{fmtDate(t.date)}{t.is_installment ? ` · parcela ${t.installment_index}` : ""}</p>
                </div>
                <span className="tabular font-medium shrink-0">{fmtMoney(t.amount)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] text-muted-foreground border-t border-border pt-3">
          Para pagar a fatura vá em <b>Transações → Nova</b>, selecione <b>Cartão</b> e depois <b>Pagar fatura</b>.
        </p>
      </DialogContent>
    </Dialog>
  );
}


function NewCardDialog({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(""); const [brand, setBrand] = useState("");
  const [limit, setLimit] = useState(""); const [closing, setClosing] = useState("1"); const [due, setDue] = useState("10");
  const [color, setColor] = useState("#3b82f6");
  const [holder, setHolder] = useState("");
  const [last4, setLast4] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (last4 && !/^\d{4}$/.test(last4)) { toast.error("Informe exatamente 4 dígitos"); return; }
    const { error } = await supabase.from("credit_cards").insert({
      user_id: userId, name, brand: brand || null, limit_total: Number(limit),
      closing_day: Number(closing), due_day: Number(due), color,
      card_holder_name: holder || null,
      last_four_digits: last4 || null,
    } as any);
    if (error) toast.error(error.message); else { toast.success("Cartão criado"); setOpen(false); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1.5" /> Cartão</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo cartão</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Apelido</Label><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nubank" /></div>
          <div className="space-y-1.5"><Label>Bandeira</Label><BrandSelect value={brand} onChange={setBrand} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nome impresso</Label><Input value={holder} onChange={(e) => setHolder(e.target.value.toUpperCase())} placeholder="MARIA SILVA" /></div>
            <div>
              <Label>Últimos 4 dígitos</Label>
              <Input
                inputMode="numeric"
                maxLength={4}
                value={last4}
                onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="1234"
              />
            </div>
          </div>
          <div><Label>Limite (R$)</Label><Input type="number" step="0.01" required value={limit} onChange={(e) => setLimit(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Fecha dia</Label><Input type="number" min="1" max="31" required value={closing} onChange={(e) => setClosing(e.target.value)} /></div>
            <div><Label>Vence dia</Label><Input type="number" min="1" max="31" required value={due} onChange={(e) => setDue(e.target.value)} /></div>
          </div>
          <div className="space-y-2">
            <Label>Cor do cartão</Label>
            <ColorSwatchPicker value={color} onChange={setColor} />
          </div>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Lock className="h-3 w-3" /> Por segurança, não armazenamos número completo nem CVV.
          </p>
          <Button type="submit" className="w-full">Salvar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
