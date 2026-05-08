import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useRealtimeQuery } from "@/lib/data-hooks";
import { fmtMoney, averagePrice, fmtDate, todayISO, parseLocalDate } from "@/lib/finance";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, TrendingUp, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const reloadAssets = () => fetchAssets().then(setAssets);
  useEffect(() => { reloadAssets(); }, []);

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
      const sortedLots = [...lots].sort((a: any, b: any) => {
        const da = parseLocalDate(a.purchase_date ?? a.date)?.getTime() ?? Infinity;
        const db = parseLocalDate(b.purchase_date ?? b.date)?.getTime() ?? Infinity;
        return da - db;
      });
      const firstPurchase = sortedLots[0]?.purchase_date ?? sortedLots[0]?.date ?? null;
      return { asset, ...avg, firstPurchase };
    });
  }, [lots, assets]);

  const stocks = positions.filter((p) => p.asset.kind === "stock" && p.quantity > 0);
  const fiis = positions.filter((p) => p.asset.kind === "fii" && p.quantity > 0);
  const totalCost = positions.reduce((s, p) => s + p.cost, 0);
  const stocksCost = stocks.reduce((s, p) => s + p.cost, 0);
  const fiisCost = fiis.reduce((s, p) => s + p.cost, 0);

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Investimentos</h1>
          <p className="text-muted-foreground text-sm mt-1">Carteira B3 — ações e FIIs</p>
        </div>
        <div className="flex gap-2">
          <NewLotDialog assets={assets} userId={user!.id} onAssetCreated={reloadAssets} />
          <NewDividendDialog assets={assets} userId={user!.id} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-5 shadow-soft">
          <p className="text-xs text-muted-foreground">Patrimônio (custo)</p>
          <p className="text-2xl font-semibold tabular mt-1">{fmtMoney(totalCost)}</p>
          <p className="text-xs text-muted-foreground mt-1">{positions.length} ativos</p>
        </Card>
        <Card className="p-5 shadow-soft">
          <p className="text-xs text-muted-foreground">Ações</p>
          <p className="text-2xl font-semibold tabular mt-1">{fmtMoney(stocksCost)}</p>
          <p className="text-xs text-muted-foreground mt-1">{stocks.length} ativos</p>
        </Card>
        <Card className="p-5 shadow-soft">
          <p className="text-xs text-muted-foreground">FIIs</p>
          <p className="text-2xl font-semibold tabular mt-1">{fmtMoney(fiisCost)}</p>
          <p className="text-xs text-muted-foreground mt-1">{fiis.length} ativos</p>
        </Card>
      </div>

      <Tabs defaultValue="todos">
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="acoes">Ações</TabsTrigger>
          <TabsTrigger value="fiis">FIIs</TabsTrigger>
          <TabsTrigger value="proventos">Proventos</TabsTrigger>
        </TabsList>

        <TabsContent value="todos" className="space-y-6 mt-6">
          <PositionTable title="Ações" rows={stocks} />
          <PositionTable title="FIIs" rows={fiis} />
          {positions.length === 0 && <EmptyPositions />}
        </TabsContent>
        <TabsContent value="acoes" className="mt-6">
          {stocks.length === 0 ? <EmptyPositions /> : <PositionTable title="Ações" rows={stocks} />}
        </TabsContent>
        <TabsContent value="fiis" className="mt-6">
          {fiis.length === 0 ? <EmptyPositions /> : <PositionTable title="FIIs" rows={fiis} />}
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

function EmptyPositions() {
  return (
    <Card className="p-12 text-center shadow-soft">
      <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground">Nenhum ativo nesta categoria.</p>
    </Card>
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
          <tr>
            <th className="text-left px-5 py-2">Ativo</th>
            <th className="text-right">Qtd</th>
            <th className="text-right">P. Médio</th>
            <th className="text-center">1ª compra</th>
            <th className="text-right px-5">Custo total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.asset.id} className="border-t border-border">
              <td className="px-5 py-3 font-medium">{r.asset.ticker}<p className="text-xs text-muted-foreground font-normal">{r.asset.name}</p></td>
              <td className="text-right tabular">{r.quantity}</td>
              <td className="text-right tabular">{fmtMoney(r.average)}</td>
              <td className="text-center tabular text-muted-foreground text-xs">{fmtDate(r.firstPurchase)}</td>
              <td className="text-right tabular px-5 font-medium">{fmtMoney(r.cost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

/* ============ Asset Picker (BRAPI autocomplete + manual fallback) ============ */

type SearchHit = { ticker: string; name: string; kind: "stock" | "fii" };

function AssetPicker({
  assets, value, onChange, kindRequired, onKindChange, onAssetCreated,
}: {
  assets: any[];
  value: string;
  onChange: (assetId: string) => void;
  kindRequired: "stock" | "fii";
  onKindChange: (k: "stock" | "fii") => void;
  onAssetCreated: () => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = assets.find((a) => a.id === value);

  // Debounced BRAPI search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (manual || query.trim().length < 2) { setHits([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const r = await fetch(`${SUPABASE_URL}/functions/v1/brapi-search?q=${encodeURIComponent(query.trim())}`);
        const data = await r.json();
        if (Array.isArray(data)) setHits(data);
        else setHits([]);
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, manual]);

  const pickHit = async (hit: SearchHit) => {
    // Find local asset, else create
    let asset = assets.find((a) => a.ticker.toUpperCase() === hit.ticker.toUpperCase());
    if (!asset) {
      const { data, error } = await supabase
        .from("assets")
        .insert({ ticker: hit.ticker.toUpperCase(), name: hit.name, kind: hit.kind } as any)
        .select()
        .single();
      if (error) { toast.error(error.message); return; }
      asset = data;
      onAssetCreated();
    }
    onChange(asset.id);
    onKindChange(asset.kind);
    setQuery(`${asset.ticker} — ${asset.name}`);
    setOpen(false);
  };

  const submitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const ticker = query.trim().toUpperCase();
    if (ticker.length < 4) { toast.error("Ticker inválido"); return; }
    let asset = assets.find((a) => a.ticker.toUpperCase() === ticker);
    if (!asset) {
      const { data, error } = await supabase
        .from("assets")
        .insert({ ticker, name: ticker, kind: kindRequired } as any)
        .select()
        .single();
      if (error) { toast.error(error.message); return; }
      asset = data;
      onAssetCreated();
    }
    onChange(asset.id);
    setQuery(`${asset.ticker} — ${asset.name}`);
    toast.success("Ativo adicionado");
  };

  return (
    <div className="space-y-2">
      <Label>Ativo (digite ticker ou nome)</Label>
      <div className="relative">
        <Input
          value={query || (selected ? `${selected.ticker} — ${selected.name}` : "")}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); onChange(""); }}
          onFocus={() => setOpen(true)}
          placeholder="Ex: PETR4, MXRF11..."
        />
        {open && !manual && query.length >= 2 && (
          <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-64 overflow-auto">
            {loading ? (
              <div className="px-3 py-3 text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Buscando na BRAPI...
              </div>
            ) : hits.length === 0 ? (
              <div className="px-3 py-3 text-xs text-muted-foreground">
                Nenhum resultado.{" "}
                <button type="button" className="text-primary hover:underline" onClick={() => setManual(true)}>
                  Adicionar manualmente
                </button>
              </div>
            ) : (
              hits.map((h) => (
                <button
                  key={h.ticker}
                  type="button"
                  onClick={() => pickHit(h)}
                  className="w-full text-left px-3 py-2 hover:bg-accent flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">{h.ticker}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[280px]">{h.name}</p>
                  </div>
                  <span className="text-[10px] uppercase text-muted-foreground">{h.kind === "fii" ? "FII" : "Ação"}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {manual && (
        <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/30">
          <p className="text-xs text-muted-foreground">Cadastro manual — informe ticker e tipo</p>
          <Select value={kindRequired} onValueChange={(v) => onKindChange(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="stock">Ação</SelectItem>
              <SelectItem value="fii">FII</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" size="sm" variant="outline" className="w-full" onClick={submitManual}>
            Adicionar "{query.toUpperCase()}"
          </Button>
          <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => setManual(false)}>
            Voltar para busca automática
          </button>
        </div>
      )}
    </div>
  );
}

function NewLotDialog({ assets, userId, onAssetCreated }: { assets: any[]; userId: string; onAssetCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [assetId, setAssetId] = useState("");
  const [kind, setKind] = useState<"stock" | "fii">("stock");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [qty, setQty] = useState(""); const [price, setPrice] = useState(""); const [broker, setBroker] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId) { toast.error("Selecione um ativo"); return; }
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
          <AssetPicker assets={assets} value={assetId} onChange={setAssetId} kindRequired={kind} onKindChange={setKind} onAssetCreated={onAssetCreated} />
          <div>
            <Label>Tipo</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="stock">Ação</SelectItem>
                <SelectItem value="fii">FII</SelectItem>
              </SelectContent>
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
    if (!assetId) { toast.error("Selecione um ativo"); return; }
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
