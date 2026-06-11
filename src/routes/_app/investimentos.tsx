import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useRealtimeQuery, fetchAssets } from "@/lib/data-hooks";
import { fmtMoney, averagePrice, todayISO } from "@/lib/finance";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DatePicker } from "@/components/date-picker";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export const Route = createFileRoute("/_app/investimentos")({
  component: InvestPage,
});

type Kind = "stock" | "fii" | "rendafixa" | "cripto";

const KIND_META: Record<Kind, { label: string; color: string; chip: string }> = {
  stock:     { label: "Ações",      color: "#3b82f6", chip: "bg-blue-500/10 text-blue-300 border-blue-500/20" },
  fii:       { label: "FIIs",       color: "#a855f7", chip: "bg-purple-500/10 text-purple-300 border-purple-500/20" },
  rendafixa: { label: "Renda Fixa", color: "#10b981", chip: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" },
  cripto:    { label: "Cripto",     color: "#f59e0b", chip: "bg-amber-500/10 text-amber-300 border-amber-500/20" },
};

function InvestPage() {
  const { user } = useAuth();
  const { data: lots } = useRealtimeQuery("holdings_lots", user?.id);
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
    return Array.from(byAsset.values())
      .map(({ asset, lots }) => {
        const avg = averagePrice(lots);
        const current = Number(asset.current_price ?? 0) || avg.average;
        const marketValue = avg.quantity * current;
        return { asset, ...avg, current, marketValue, pnl: marketValue - avg.cost };
      })
      .filter((p) => p.quantity > 0);
  }, [lots, assets]);

  const totals = useMemo(() => {
    const cost = positions.reduce((s, p) => s + p.cost, 0);
    const market = positions.reduce((s, p) => s + p.marketValue, 0);
    const pnl = market - cost;
    const pct = cost > 0 ? (pnl / cost) * 100 : 0;
    return { cost, market, pnl, pct };
  }, [positions]);

  const allocation = useMemo(() => {
    const byKind = new Map<Kind, number>();
    positions.forEach((p) => {
      byKind.set(p.asset.kind, (byKind.get(p.asset.kind) ?? 0) + p.marketValue);
    });
    const total = Array.from(byKind.values()).reduce((s, v) => s + v, 0);
    return Array.from(byKind.entries()).map(([kind, value]) => ({
      kind,
      label: KIND_META[kind]?.label ?? kind,
      color: KIND_META[kind]?.color ?? "#888",
      value,
      pct: total > 0 ? (value / total) * 100 : 0,
    }));
  }, [positions]);

  const positive = totals.pnl >= 0;

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Investimentos</h1>
          <p className="text-muted-foreground text-sm mt-1">Sua carteira em um único lugar</p>
        </div>
        <NewLotDialog assets={assets} userId={user!.id} onAssetCreated={reloadAssets} />
      </div>

      {/* Hero + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <Card className="lg:col-span-2 p-8 shadow-soft bg-gradient-to-br from-zinc-900 to-zinc-900/60 border-white/5 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Patrimônio Total</p>
            <p className="text-5xl font-bold tabular mt-3 tracking-tight">{fmtMoney(totals.market)}</p>
            <div className={`flex items-center gap-2 mt-4 ${positive ? "text-emerald-400" : "text-rose-400"}`}>
              {positive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              <span className="text-sm font-medium tabular">
                {positive ? "+" : ""}{fmtMoney(totals.pnl)} ({positive ? "+" : ""}{totals.pct.toFixed(2)}%)
              </span>
              <span className="text-xs text-muted-foreground ml-1">rentabilidade total</span>
            </div>
            <div className="flex gap-6 mt-6 pt-6 border-t border-white/5 text-xs">
              <div>
                <p className="text-muted-foreground">Custo total</p>
                <p className="tabular font-medium mt-0.5">{fmtMoney(totals.cost)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Ativos</p>
                <p className="tabular font-medium mt-0.5">{positions.length}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-soft">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Alocação</p>
          {allocation.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">
              Sem ativos
            </div>
          ) : (
            <>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocation}
                      dataKey="value"
                      innerRadius={48}
                      outerRadius={70}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {allocation.map((a) => (
                        <Cell key={a.kind} fill={a.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any) => fmtMoney(Number(v))}
                      contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1.5 mt-2">
                {allocation.map((a) => (
                  <li key={a.kind} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: a.color }} />
                      {a.label}
                    </span>
                    <span className="tabular text-muted-foreground">{a.pct.toFixed(1)}%</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      {/* Tabs + lista */}
      <Tabs defaultValue="todos">
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="stock">Ações</TabsTrigger>
          <TabsTrigger value="fii">FIIs</TabsTrigger>
          <TabsTrigger value="rendafixa">Renda Fixa</TabsTrigger>
          <TabsTrigger value="cripto">Cripto</TabsTrigger>
        </TabsList>

        <TabsContent value="todos" className="mt-6">
          <PositionList rows={positions} />
        </TabsContent>
        {(["stock", "fii", "rendafixa", "cripto"] as Kind[]).map((k) => (
          <TabsContent key={k} value={k} className="mt-6">
            <PositionList rows={positions.filter((p) => p.asset.kind === k)} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function PositionList({ rows }: { rows: any[] }) {
  if (rows.length === 0) {
    return (
      <Card className="p-12 text-center shadow-soft">
        <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Nenhum ativo nesta categoria.</p>
      </Card>
    );
  }
  return (
    <Card className="shadow-soft overflow-hidden divide-y divide-white/5">
      {rows.map((r) => {
        const meta = KIND_META[r.asset.kind as Kind];
        return (
          <div key={r.asset.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold tracking-tight">{r.asset.ticker}</p>
                <span className={`text-[10px] uppercase font-medium px-1.5 py-0.5 rounded-full border ${meta?.chip}`}>
                  {meta?.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 tabular">
                {Number(r.quantity).toLocaleString("pt-BR")} × {fmtMoney(r.average)}
              </p>
            </div>
            <div className="text-right">
              <p className="tabular font-semibold">{fmtMoney(r.marketValue)}</p>
              <p className={`text-xs tabular mt-0.5 ${r.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {r.pnl >= 0 ? "+" : ""}{fmtMoney(r.pnl)}
              </p>
            </div>
          </div>
        );
      })}
    </Card>
  );
}

function NewLotDialog({ assets, userId, onAssetCreated }: { assets: any[]; userId: string; onAssetCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [assetId, setAssetId] = useState("");
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Kind>("stock");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [date, setDate] = useState(todayISO());
  const [broker, setBroker] = useState("");

  const reset = () => {
    setMode("existing"); setAssetId(""); setTicker(""); setName(""); setKind("stock");
    setQty(""); setPrice(""); setCurrentPrice(""); setBroker(""); setDate(todayISO());
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalAssetId = assetId;

    if (mode === "new") {
      const tk = ticker.trim().toUpperCase();
      if (!tk) { toast.error("Informe o ticker"); return; }
      const { data, error } = await supabase
        .from("assets")
        .insert({
          ticker: tk,
          name: name.trim() || tk,
          kind,
          current_price: currentPrice ? Number(currentPrice) : null,
        } as any)
        .select()
        .single();
      if (error) { toast.error(error.message); return; }
      finalAssetId = data.id;
      onAssetCreated();
    } else {
      if (!assetId) { toast.error("Selecione um ativo"); return; }
      if (currentPrice) {
        await supabase.from("assets").update({ current_price: Number(currentPrice) } as any).eq("id", assetId);
        onAssetCreated();
      }
    }

    const { error } = await supabase.from("holdings_lots").insert({
      user_id: userId,
      asset_id: finalAssetId,
      date,
      purchase_date: date,
      quantity: Number(qty),
      unit_price: Number(price),
      broker: broker || null,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Aporte registrado");
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-1.5" /> Novo Aporte</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Novo Aporte</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
            <TabsList className="w-full">
              <TabsTrigger value="existing" className="flex-1">Ativo existente</TabsTrigger>
              <TabsTrigger value="new" className="flex-1">Novo ativo</TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="space-y-3 mt-3">
              <div>
                <Label>Ativo</Label>
                <Select value={assetId} onValueChange={setAssetId}>
                  <SelectTrigger><SelectValue placeholder={assets.length ? "Selecione" : "Cadastre um ativo"} /></SelectTrigger>
                  <SelectContent>
                    {assets.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.ticker} — {a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="new" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Ticker</Label>
                  <Input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="BBAS3" />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stock">Ações</SelectItem>
                      <SelectItem value="fii">FIIs</SelectItem>
                      <SelectItem value="rendafixa">Renda Fixa</SelectItem>
                      <SelectItem value="cripto">Cripto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Nome (opcional)</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Banco do Brasil" />
              </div>
            </TabsContent>
          </Tabs>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantidade</Label>
              <Input type="number" step="0.0001" required value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div>
              <Label>Preço Médio (R$)</Label>
              <Input type="number" step="0.0001" required value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cotação Atual (R$)</Label>
              <Input type="number" step="0.0001" value={currentPrice} onChange={(e) => setCurrentPrice(e.target.value)} placeholder="opcional" />
            </div>
            <div>
              <Label>Data</Label>
              <DatePicker value={date} onChange={setDate} />
            </div>
          </div>

          <div>
            <Label>Corretora (opcional)</Label>
            <Input value={broker} onChange={(e) => setBroker(e.target.value)} placeholder="XP, Clear..." />
          </div>

          <Button type="submit" className="w-full">Salvar aporte</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
