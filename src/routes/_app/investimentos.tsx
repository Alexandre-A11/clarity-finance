import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useRealtimeQuery } from "@/lib/data-hooks";
import { fmtMoney, averagePrice } from "@/lib/finance";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAssets } from "@/lib/data-hooks";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/investimentos")({
  component: InvestPage,
});

function InvestPage() {
  const { user } = useAuth();
  const { data: lots } = useRealtimeQuery("holdings_lots", user?.id);
  const { data: dividends } = useRealtimeQuery("dividends", user?.id);
  const [assets, setAssets] = useState<any[]>([]);
  useEffect(() => { fetchAssets().then(setAssets); }, []);

  const positions = useMemo(() => {
    const byAsset = new Map<string, { asset: any; lots: any[] }>();
    lots.forEach((l: any) => {
      const a = assets.find((x) => x.id === l.asset_id);
      if (!a) return;
      const cur = byAsset.get(a.id) ?? { asset: a, lots: [] };
      cur.lots.push(l);
      byAsset.set(a.id, cur);
    });
    return Array.from(byAsset.values()).map(({ asset, lots }) => {
      const avg = averagePrice(lots);
      return { asset, ...avg };
    });
  }, [lots, assets]);

  const stocks = positions.filter((p) => p.asset.kind === "stock" && p.quantity > 0);
  const fiis = positions.filter((p) => p.asset.kind === "fii" && p.quantity > 0);
  const totalCost = positions.reduce((s, p) => s + p.cost, 0);

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Investimentos</h1>
          <p className="text-muted-foreground text-sm mt-1">Carteira B3 — ações e FIIs</p>
        </div>
        <div className="flex gap-2">
          <NewLotDialog assets={assets} userId={user!.id} />
          <NewDividendDialog assets={assets} userId={user!.id} />
        </div>
      </div>

      <Card className="p-6 shadow-soft mb-6">
        <p className="text-xs text-muted-foreground">Patrimônio investido (a custo)</p>
        <p className="text-3xl font-semibold tabular mt-1">{fmtMoney(totalCost)}</p>
        <p className="text-xs text-muted-foreground mt-1">{positions.length} ativos • {lots.length} lotes</p>
      </Card>

      <Tabs defaultValue="carteira">
        <TabsList>
          <TabsTrigger value="carteira">Carteira</TabsTrigger>
          <TabsTrigger value="proventos">Proventos</TabsTrigger>
        </TabsList>

        <TabsContent value="carteira" className="space-y-6 mt-6">
          <PositionTable title="Ações" rows={stocks} />
          <PositionTable title="FIIs" rows={fiis} />
          {positions.length === 0 && (
            <Card className="p-12 text-center shadow-soft">
              <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Lance sua primeira compra para começar.</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="proventos" className="mt-6">
          <Card className="shadow-soft overflow-hidden">
            {dividends.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">Nenhum provento registrado.</div>
            ) : (
              <ul className="divide-y divide-border">
                {dividends.map((d: any) => {
                  const a = assets.find((x) => x.id === d.asset_id);
                  return (
                    <li key={d.id} className="flex items-center gap-4 px-5 py-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{a?.ticker} <span className="text-xs text-muted-foreground font-normal">• {d.type === "jcp" ? "JCP" : d.type === "rendimento" ? "Rendimento" : "Dividendo"}</span></p>
                        <p className="text-xs text-muted-foreground">{new Date(d.payment_date).toLocaleDateString("pt-BR")} • {d.broker ?? "—"}</p>
                      </div>
                      <span className="tabular font-medium text-success">{fmtMoney(d.net)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PositionTable({ title, rows }: { title: string; rows: any[] }) {
  if (rows.length === 0) return null;
  const subtotal = rows.reduce((s, r) => s + r.cost, 0);
  return (
    <Card className="shadow-soft overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <h3 className="text-sm font-medium">{title}</h3>
        <span className="text-sm tabular text-muted-foreground">{fmtMoney(subtotal)}</span>
      </div>
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr><th className="text-left px-5 py-2">Ativo</th><th className="text-right">Qtd</th><th className="text-right">P. Médio</th><th className="text-right px-5">Custo total</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.asset.id} className="border-t border-border">
              <td className="px-5 py-3 font-medium">{r.asset.ticker}<p className="text-xs text-muted-foreground font-normal">{r.asset.name}</p></td>
              <td className="text-right tabular">{r.quantity}</td>
              <td className="text-right tabular">{fmtMoney(r.average)}</td>
              <td className="text-right tabular px-5 font-medium">{fmtMoney(r.cost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function NewLotDialog({ assets, userId }: { assets: any[]; userId: string }) {
  const [open, setOpen] = useState(false);
  const [assetId, setAssetId] = useState(""); const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [qty, setQty] = useState(""); const [price, setPrice] = useState(""); const [broker, setBroker] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("holdings_lots").insert({
      user_id: userId, asset_id: assetId, date, quantity: Number(qty),
      unit_price: Number(price), broker: broker || null,
    } as any);
    if (error) toast.error(error.message); else { toast.success("Compra registrada"); setOpen(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1.5" /> Lançar compra</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova compra</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Ativo</Label>
            <Select value={assetId} onValueChange={setAssetId} required>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{assets.map((a) => <SelectItem key={a.id} value={a.id}>{a.ticker} — {a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Quantidade</Label><Input type="number" step="0.0001" required value={qty} onChange={(e) => setQty(e.target.value)} /></div>
            <div><Label>Preço (R$)</Label><Input type="number" step="0.0001" required value={price} onChange={(e) => setPrice(e.target.value)} /></div>
          </div>
          <div><Label>Data</Label><Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><Label>Corretora (opcional)</Label><Input value={broker} onChange={(e) => setBroker(e.target.value)} placeholder="XP, Clear..." /></div>
          <Button type="submit" className="w-full">Salvar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewDividendDialog({ assets, userId }: { assets: any[]; userId: string }) {
  const [open, setOpen] = useState(false);
  const [assetId, setAssetId] = useState(""); const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [gross, setGross] = useState(""); const [net, setNet] = useState("");
  const [type, setType] = useState<"dividend" | "jcp" | "rendimento">("dividend");
  const [broker, setBroker] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("dividends").insert({
      user_id: userId, asset_id: assetId, payment_date: date,
      gross: Number(gross), net: Number(net || gross), type, broker: broker || null,
    } as any);
    if (error) toast.error(error.message); else { toast.success("Provento registrado"); setOpen(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline"><Plus className="h-4 w-4 mr-1.5" /> Provento</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo provento</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Ativo</Label>
            <Select value={assetId} onValueChange={setAssetId} required>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{assets.map((a) => <SelectItem key={a.id} value={a.id}>{a.ticker}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dividend">Dividendo</SelectItem>
                <SelectItem value="jcp">JCP</SelectItem>
                <SelectItem value="rendimento">Rendimento (FII)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Bruto (R$)</Label><Input type="number" step="0.01" required value={gross} onChange={(e) => setGross(e.target.value)} /></div>
            <div><Label>Líquido (R$)</Label><Input type="number" step="0.01" value={net} onChange={(e) => setNet(e.target.value)} /></div>
          </div>
          <div><Label>Data pagamento</Label><Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><Label>Corretora</Label><Input value={broker} onChange={(e) => setBroker(e.target.value)} /></div>
          <Button type="submit" className="w-full">Salvar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
