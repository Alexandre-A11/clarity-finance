import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useRealtimeQuery } from "@/lib/data-hooks";
import { fmtMoney, fmtDate } from "@/lib/finance";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Plus, CreditCard as CardIcon, Lock, Trash2, Receipt, Layers, ArrowRight, ChevronDown, CheckCircle2, Circle } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
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
  const { data: cats } = useRealtimeQuery("categories", user?.id);
  const { hidden } = usePrivacy();
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  const openCard = useMemo(
    () => cards.find((c: any) => c.id === openCardId) ?? null,
    [cards, openCardId],
  );

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cartões de crédito</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Toque em um cartão para ver as compras ativas. Pagamentos são feitos em <span className="font-medium text-foreground">Transações → Nova</span>.
          </p>
        </div>
        <NewCardDialog userId={user!.id} />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.length === 0 ? (
          <Card className="p-12 text-center sm:col-span-2 lg:col-span-3 shadow-soft">
            <CardIcon className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Cadastre seu primeiro cartão.</p>
          </Card>
        ) : cards.map((c: any) => (
          <CardSummary
            key={c.id}
            card={c}
            txs={txs}
            hidden={hidden}
            onOpen={() => setOpenCardId(c.id)}
          />
        ))}
      </div>

      <CardDetailSheet
        card={openCard}
        txs={txs}
        cats={cats}
        open={!!openCard}
        onOpenChange={(o) => !o && setOpenCardId(null)}
      />
    </div>
  );
}

function CardSummary({ card: c, txs, hidden, onOpen }: { card: any; txs: any[]; hidden: boolean; onOpen: () => void }) {
  const cardTxs = txs.filter((t: any) => t.card_id === c.id);
  const unpaid = cardTxs.filter((t: any) => t.is_paid === false);
  const unpaidTotal = unpaid.reduce((s, t: any) => s + Number(t.amount), 0);

  // Count distinct active purchases (purchase_group_id with pending installments).
  // Legacy unpaid items without a group are counted individually.
  const activeGroups = new Set<string>();
  let standaloneUnpaid = 0;
  for (const t of unpaid) {
    if (t.purchase_group_id) activeGroups.add(t.purchase_group_id);
    else standaloneUnpaid++;
  }
  const openCount = activeGroups.size + standaloneUnpaid;

  const removeCard = async () => {
    const { error } = await supabase.from("credit_cards").delete().eq("id", c.id);
    if (error) toast.error(error.message); else toast.success("Cartão removido");
  };

  return (
    <Card className="p-4 shadow-soft group">
      <button
        type="button"
        onClick={onOpen}
        className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
      >
        <div className="mx-auto w-full max-w-[280px] transition-transform group-hover:-translate-y-0.5">
          <CreditCardVisual
            name={c.name}
            brand={c.brand}
            color={c.color}
            holder={c.card_holder_name}
            lastFour={c.last_four_digits}
            hidden={hidden}
          />
        </div>
      </button>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="min-w-0">
          {openCount === 0 ? (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Receipt className="h-3 w-3" /> Sem compras ativas
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium px-2 py-1 rounded-md bg-primary-soft text-primary border border-primary/15">
              <Layers className="h-3 w-3" />
              {openCount} compra{openCount > 1 ? "s" : ""} ativa{openCount > 1 ? "s" : ""} · {fmtMoney(unpaidTotal)}
            </span>
          )}
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive shrink-0">
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

      <button
        type="button"
        onClick={onOpen}
        className="mt-3 w-full text-xs text-primary hover:underline inline-flex items-center justify-center gap-1"
      >
        Ver compras <ArrowRight className="h-3 w-3" />
      </button>
    </Card>
  );
}

function CardDetailSheet({
  card, txs, cats, open, onOpenChange,
}: {
  card: any | null; txs: any[]; cats: any[]; open: boolean; onOpenChange: (o: boolean) => void;
}) {
  const navigate = useNavigate();
  if (!card) return null;

  const catById = new Map(cats.map((c: any) => [c.id, c]));
  const cardTxs = txs
    .filter((t: any) => t.card_id === card.id)
    .sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)));

  // Build purchase-centric view: group all card transactions by purchase_group_id.
  // Legacy items without group_id are treated as standalone 1x purchases.
  type Purchase = {
    key: string;
    title: string;
    categoryId: string | null;
    firstDate: string;
    installments: any[]; // sorted by installment_index
    total: number;
    paidAmount: number;
    paidCount: number;
    totalCount: number;
    remaining: number;
    fullyPaid: boolean;
    createdAt: string;
  };
  const purchasesMap = new Map<string, any[]>();
  const standalone: any[] = [];
  for (const t of cardTxs) {
    if (t.purchase_group_id) {
      if (!purchasesMap.has(t.purchase_group_id)) purchasesMap.set(t.purchase_group_id, []);
      purchasesMap.get(t.purchase_group_id)!.push(t);
    } else {
      standalone.push(t);
    }
  }
  const purchases: Purchase[] = [];
  for (const [gid, arr] of purchasesMap.entries()) {
    arr.sort((a, b) => (a.installment_index ?? 0) - (b.installment_index ?? 0));
    const total = arr.reduce((s, x) => s + Number(x.amount), 0);
    const paidCount = arr.filter((x) => x.is_paid).length;
    const paidAmount = arr.filter((x) => x.is_paid).reduce((s, x) => s + Number(x.amount), 0);
    const title = (arr[0].description ?? "Compra").replace(/\s*\(\d+\/\d+\)\s*$/, "");
    purchases.push({
      key: `g-${gid}`,
      title,
      categoryId: arr[0].category_id ?? null,
      firstDate: arr[0].date,
      installments: arr,
      total,
      paidAmount,
      paidCount,
      totalCount: arr.length,
      remaining: Math.max(total - paidAmount, 0),
      fullyPaid: paidCount === arr.length,
      createdAt: arr[0].created_at ?? arr[0].date,
    });
  }
  for (const t of standalone) {
    purchases.push({
      key: `t-${t.id}`,
      title: t.description ?? "Lançamento",
      categoryId: t.category_id ?? null,
      firstDate: t.date,
      installments: [t],
      total: Number(t.amount),
      paidAmount: t.is_paid ? Number(t.amount) : 0,
      paidCount: t.is_paid ? 1 : 0,
      totalCount: 1,
      remaining: t.is_paid ? 0 : Number(t.amount),
      fullyPaid: !!t.is_paid,
      createdAt: t.created_at ?? t.date,
    });
  }
  // Active first (not fully paid), then by most recent purchase date.
  purchases.sort((a, b) => {
    if (a.fullyPaid !== b.fullyPaid) return a.fullyPaid ? 1 : -1;
    return String(b.firstDate).localeCompare(String(a.firstDate));
  });

  const used = cardTxs.filter((t: any) => t.is_paid === false).reduce((s, t: any) => s + Number(t.amount), 0);
  const limit = Number(card.limit_total);
  const available = Math.max(limit - used, 0);
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;

  const goPay = () => {
    onOpenChange(false);
    navigate({ to: "/transacoes", search: { payInvoice: card.id } as any });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{card.name}</SheetTitle>
          <SheetDescription>
            Fecha dia {card.closing_day} · vence dia {card.due_day}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 rounded-lg border border-border p-4 bg-muted/30">
          <div className="flex items-baseline justify-between">
            <p className="text-xs text-muted-foreground">Utilizado</p>
            <p className="text-xs text-muted-foreground tabular">
              {fmtMoney(available)} disponível
            </p>
          </div>
          <p className="text-2xl font-semibold tabular mt-1">{fmtMoney(used)}</p>
          <div className="h-1.5 bg-secondary rounded-full mt-2 overflow-hidden">
            <div
              className="h-full"
              style={{ width: `${pct}%`, background: pct > 80 ? "var(--destructive)" : "var(--primary)" }}
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button onClick={goPay} className="flex-1">
            <Receipt className="h-4 w-4 mr-1.5" /> Pagar fatura
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Toda saída de dinheiro acontece em <b>Transações → Nova</b>. Antecipações de parcelas também ficam por lá.
        </p>

        <div className="mt-6 space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-medium">Compras</h3>
            <p className="text-[11px] text-muted-foreground">
              {purchases.filter((p) => !p.fullyPaid).length} ativa{purchases.filter((p) => !p.fullyPaid).length === 1 ? "" : "s"} · {purchases.length} no total
            </p>
          </div>

          {purchases.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhuma compra neste cartão.
            </p>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {purchases.map((p) => {
                const cat = p.categoryId ? catById.get(p.categoryId) : null;
                const pct = p.totalCount > 0 ? (p.paidCount / p.totalCount) * 100 : 0;
                const pending = p.totalCount - p.paidCount;
                const isMulti = p.totalCount > 1;

                return (
                  <AccordionItem
                    key={p.key}
                    value={p.key}
                    className={`rounded-lg border ${p.fullyPaid ? "border-emerald-200 bg-emerald-50/40" : "border-border bg-card"} overflow-hidden`}
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline [&>svg]:hidden group">
                      <div className="flex items-start gap-3 w-full">
                        <ChevronDown className="h-4 w-4 mt-0.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 shrink-0" />
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium truncate">{p.title}</p>
                            {cat && (
                              <span className="text-[10px] text-muted-foreground shrink-0">· {cat.name}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {p.fullyPaid ? (
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="h-2.5 w-2.5" /> Quitada
                              </span>
                            ) : isMulti ? (
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded bg-primary-soft text-primary border border-primary/15">
                                <Layers className="h-2.5 w-2.5" />
                                {pending} parcela{pending === 1 ? "" : "s"} pendente{pending === 1 ? "" : "s"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                                Pendente
                              </span>
                            )}
                            {isMulti && (
                              <span className="text-[10px] text-muted-foreground">
                                Progresso: {p.paidCount}/{p.totalCount} pagas
                              </span>
                            )}
                          </div>
                          {isMulti && (
                            <div className="h-1 bg-secondary rounded-full overflow-hidden mt-2 max-w-[240px]">
                              <div
                                className="h-full"
                                style={{ width: `${pct}%`, background: p.fullyPaid ? "var(--primary)" : "var(--primary)" }}
                              />
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold tabular">{fmtMoney(p.total)}</p>
                          {!p.fullyPaid && p.remaining > 0 && (
                            <p className="text-[11px] text-muted-foreground tabular">
                              Resta {fmtMoney(p.remaining)}
                            </p>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="rounded-md bg-muted/30 p-3">
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="text-muted-foreground">Compra original</span>
                          <span className="tabular">{fmtDate(p.firstDate)}</span>
                        </div>
                        <ul className="divide-y divide-border/60">
                          {p.installments.map((x: any, idx: number) => {
                            const num = x.installment_index ?? (idx + 1);
                            return (
                              <li key={x.id} className="py-2 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  {x.is_paid ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                  ) : (
                                    <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium">
                                      Parcela {num}{isMulti ? ` de ${p.totalCount}` : ""}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                      Vence {fmtDate(x.due_date ?? x.date)}
                                    </p>
                                  </div>
                                </div>
                                <span className="tabular text-xs font-medium shrink-0">{fmtMoney(x.amount)}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>
      </SheetContent>
    </Sheet>
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
