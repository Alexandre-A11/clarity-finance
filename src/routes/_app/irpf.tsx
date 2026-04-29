import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useRealtimeQuery, fetchAssets } from "@/lib/data-hooks";
import { fmtMoney, averagePrice } from "@/lib/finance";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/irpf")({
  component: IrpfPage,
});

function IrpfPage() {
  const { user } = useAuth();
  const { data: lots } = useRealtimeQuery("holdings_lots", user?.id);
  const { data: dividends } = useRealtimeQuery("dividends", user?.id);
  const [assets, setAssets] = useState<any[]>([]);
  useEffect(() => { fetchAssets().then(setAssets); }, []);

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear - 1));
  const yearN = Number(year);

  // Bens e Direitos: posição em 31/12 do ano selecionado
  const positions = useMemo(() => {
    const cutoff = `${year}-12-31`;
    const byAsset = new Map<string, { asset: any; lots: any[] }>();
    lots
      .filter((l: any) => l.date <= cutoff)
      .forEach((l: any) => {
        const a = assets.find((x) => x.id === l.asset_id);
        if (!a) return;
        const cur = byAsset.get(a.id) ?? { asset: a, lots: [] };
        cur.lots.push(l);
        byAsset.set(a.id, cur);
      });
    return Array.from(byAsset.values())
      .map(({ asset, lots }) => ({ asset, ...averagePrice(lots) }))
      .filter((p) => p.quantity > 0);
  }, [lots, assets, year]);

  // Rendimentos do ano agrupados por ativo
  const incomes = useMemo(() => {
    const byAsset = new Map<string, { asset: any; dividend: number; jcp: number; rendimento: number }>();
    dividends
      .filter((d: any) => new Date(d.payment_date).getFullYear() === yearN)
      .forEach((d: any) => {
        const a = assets.find((x) => x.id === d.asset_id);
        if (!a) return;
        const cur = byAsset.get(a.id) ?? { asset: a, dividend: 0, jcp: 0, rendimento: 0 };
        cur[d.type as "dividend" | "jcp" | "rendimento"] += Number(d.net);
        byAsset.set(a.id, cur);
      });
    return Array.from(byAsset.values());
  }, [dividends, assets, yearN]);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado");
  };

  const benDescription = (p: any) =>
    `${p.quantity} ${p.asset.kind === "fii" ? "cotas" : "ações"} de ${p.asset.name} (${p.asset.ticker}), CNPJ ${p.asset.cnpj ?? "—"}. Custo total de aquisição: ${fmtMoney(p.cost)}. Preço médio: ${fmtMoney(p.average)}.`;

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assistente IRPF</h1>
          <p className="text-muted-foreground text-sm mt-1">Dados consolidados para a declaração</p>
        </div>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[currentYear - 1, currentYear - 2, currentYear - 3].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="bens">
        <TabsList>
          <TabsTrigger value="bens">Bens e Direitos</TabsTrigger>
          <TabsTrigger value="rend">Rendimentos</TabsTrigger>
        </TabsList>

        <TabsContent value="bens" className="mt-6">
          <p className="text-xs text-muted-foreground mb-3">Posição em 31/12/{year}</p>
          {positions.length === 0 ? (
            <Card className="p-12 text-center shadow-soft text-sm text-muted-foreground">Sem posição neste ano.</Card>
          ) : (
            <div className="space-y-3">
              {positions.map((p) => (
                <Card key={p.asset.id} className="p-5 shadow-soft">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium">{p.asset.ticker} — {p.asset.name}</p>
                      <p className="text-xs text-muted-foreground">CNPJ: {p.asset.cnpj ?? "—"}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => copy(benDescription(p))}>
                      <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div><p className="text-xs text-muted-foreground">Quantidade</p><p className="tabular font-medium">{p.quantity}</p></div>
                    <div><p className="text-xs text-muted-foreground">Preço médio</p><p className="tabular font-medium">{fmtMoney(p.average)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Custo total</p><p className="tabular font-medium">{fmtMoney(p.cost)}</p></div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 p-3 bg-muted/40 rounded-md">{benDescription(p)}</p>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rend" className="mt-6 space-y-6">
          <Section title="Rendimentos isentos (Dividendos + Rendimentos de FII)" rows={incomes.map((i) => ({ asset: i.asset, value: i.dividend + i.rendimento }))} onCopy={copy} />
          <Section title="Rendimentos sujeitos à tributação exclusiva (JCP)" rows={incomes.map((i) => ({ asset: i.asset, value: i.jcp }))} onCopy={copy} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Section({ title, rows, onCopy }: { title: string; rows: { asset: any; value: number }[]; onCopy: (s: string) => void }) {
  const filtered = rows.filter((r) => r.value > 0);
  const total = filtered.reduce((s, r) => s + r.value, 0);
  return (
    <Card className="shadow-soft overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <h3 className="text-sm font-medium">{title}</h3>
        <span className="tabular font-semibold">{fmtMoney(total)}</span>
      </div>
      {filtered.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Nada a declarar.</div>
      ) : (
        <ul className="divide-y divide-border">
          {filtered.map((r) => (
            <li key={r.asset.id} className="flex items-center gap-3 px-5 py-3 text-sm">
              <div className="flex-1">
                <p className="font-medium">{r.asset.ticker}</p>
                <p className="text-xs text-muted-foreground">CNPJ {r.asset.cnpj ?? "—"}</p>
              </div>
              <span className="tabular font-medium">{fmtMoney(r.value)}</span>
              <Button variant="ghost" size="sm" onClick={() => onCopy(`${r.asset.cnpj ?? ""} — ${r.asset.name}: ${fmtMoney(r.value)}`)}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
