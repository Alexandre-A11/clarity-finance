import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShieldCheck, Lock, Sparkles, CheckCircle2, Loader2, Link2, Building2, RefreshCw } from "lucide-react";
import { BANKS, type Bank } from "@/lib/banks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/sincronizacao")({
  component: SyncPage,
});

type ConnRow = {
  id: string;
  bank_id: string;
  bank_name: string;
  status: string;
  last_sync_at: string | null;
};

type Step = "intro" | "redirecting" | "success";

function BankLogo({ bank, size = 44 }: { bank: Bank; size?: number }) {
  return (
    <div
      className="rounded-2xl flex items-center justify-center font-bold shadow-inner shrink-0"
      style={{
        width: size,
        height: size,
        background: bank.color,
        color: bank.fg ?? "#fff",
        fontSize: size * 0.36,
        letterSpacing: "-0.02em",
      }}
      aria-label={bank.name}
    >
      {bank.short}
    </div>
  );
}

function SyncPage() {
  const { user } = useAuth();
  const [conns, setConns] = useState<ConnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Bank | null>(null);
  const [step, setStep] = useState<Step>("intro");

  const refresh = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("bank_connections")
      .select("id, bank_id, bank_name, status, last_sync_at")
      .order("created_at", { ascending: false });
    setConns((data ?? []) as ConnRow[]);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const isConnected = (id: string) => conns.some((c) => c.bank_id === id && c.status === "connected");

  const openConnect = (bank: Bank) => {
    setActive(bank);
    setStep("intro");
  };

  const goToBank = async () => {
    if (!active || !user) return;
    setStep("redirecting");
    await new Promise((r) => setTimeout(r, 3000));
    const { error } = await supabase.from("bank_connections").upsert(
      {
        user_id: user.id,
        bank_id: active.id,
        bank_name: active.name,
        status: "connected",
        last_sync_at: new Date().toISOString(),
      },
      { onConflict: "user_id,bank_id" },
    );
    if (error) {
      toast.error("Falha ao registrar conexão");
      setStep("intro");
      return;
    }

    // Simulação Open Finance: importa transações recentes sem categoria,
    // marcadas para revisão no inbox de conciliação.
    const today = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const back = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return iso(d); };
    const samples = [
      { date: back(1), description: `${active.name} • PIX RECEBIDO JOÃO S.`,        amount: 320,    kind: "income"  as const },
      { date: back(2), description: `${active.name} • COMPRA DEBITO POSTO SHELL`,   amount: 187.4,  kind: "expense" as const },
      { date: back(3), description: `${active.name} • IFD*IFOOD`,                   amount: 54.9,   kind: "expense" as const },
      { date: back(5), description: `${active.name} • TARIFA MENSAL`,               amount: 29.9,   kind: "expense" as const },
      { date: back(6), description: `${active.name} • SUPERMERCADO PAGUE MENOS`,    amount: 246.18, kind: "expense" as const },
    ];
    await supabase.from("transactions").insert(
      samples.map((s) => ({
        user_id: user.id,
        date: s.date,
        amount: s.amount,
        kind: s.kind,
        description: s.description,
        payment_method: "checking" as const,
        is_paid: true,
        is_synced: true,
        needs_review: true,
        bank_id: active.id,
      })),
    );

    setStep("success");
    await refresh();
  };

  const disconnect = async (bankId: string) => {
    const { error } = await supabase.from("bank_connections").delete().eq("bank_id", bankId);
    if (error) return toast.error("Falha ao desconectar");
    toast.success("Banco desconectado");
    refresh();
  };

  const closeDialog = () => {
    setActive(null);
    setStep("intro");
  };

  return (
    <div className="space-y-6 fade-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-purple-300 mb-2">Open Finance</p>
          <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
            Sincronização de Contas
          </h1>
          <p className="text-sm text-gray-400 mt-1 max-w-xl">
            Conecte seus bancos para importar lançamentos automaticamente, de forma segura e auditada pelo Banco Central.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-300/90">
          <ShieldCheck className="h-4 w-4" />
          Padrão Open Finance
        </div>
      </div>

      {/* Trust strip */}
      <Card className="p-4 md:p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          {[
            { icon: Lock, title: "Criptografia ponta a ponta", desc: "Tráfego TLS 1.3 + tokens efêmeros." },
            { icon: ShieldCheck, title: "Nunca pedimos sua senha", desc: "A autorização acontece no app do seu banco." },
            { icon: Sparkles, title: "Padrão Open Finance", desc: "Regulado e auditado pelo Banco Central." },
          ].map((b) => (
            <div key={b.title} className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-300 flex items-center justify-center shrink-0">
                <b.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-white font-medium text-[13px]">{b.title}</p>
                <p className="text-xs text-gray-400">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Banks grid */}
      <div>
        <h2 className="text-sm font-medium text-white uppercase tracking-widest mb-3">Instituições disponíveis</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {BANKS.map((bank) => {
            const connected = isConnected(bank.id);
            return (
              <Card key={bank.id} className="p-4 flex items-center gap-4 hover:border-white/15 transition-colors">
                <BankLogo bank={bank} />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-[15px] leading-tight">{bank.name}</p>
                  <p className={cn("text-xs mt-0.5", connected ? "text-emerald-400" : "text-gray-400")}>
                    {connected ? "● Conectado" : "Não conectado"}
                  </p>
                </div>
                {connected ? (
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" onClick={() => disconnect(bank.id)}>
                    Desconectar
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => openConnect(bank)}>
                    Conectar
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
        {loading && <p className="text-xs text-gray-500 mt-3">Carregando conexões…</p>}
      </div>

      {/* Footer trust note */}
      <p className="text-[11px] text-gray-500 text-center pt-2">
        Você pode revogar o acesso a qualquer momento. Os dados trafegam apenas entre seu banco e este aplicativo, sob padrão Open Finance regulado pelo Banco Central do Brasil.
      </p>

      {/* Connect Dialog */}
      <Dialog open={!!active} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          {active && (
            <>
              {step === "intro" && (
                <>
                  <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <BankLogo bank={active} size={40} />
                      <div>
                        <DialogTitle>Conectar com {active.name}</DialogTitle>
                        <DialogDescription>Autorização via Open Finance</DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3 text-sm text-gray-300">
                    <p>
                      Você será redirecionado de forma segura para o ambiente do seu banco para autorizar a conexão.
                    </p>
                    <ul className="space-y-1.5 text-xs text-gray-400">
                      <li className="flex gap-2"><Lock className="h-3.5 w-3.5 mt-0.5 text-emerald-300" /> Conexão criptografada de ponta a ponta</li>
                      <li className="flex gap-2"><ShieldCheck className="h-3.5 w-3.5 mt-0.5 text-emerald-300" /> Não temos acesso às suas senhas</li>
                      <li className="flex gap-2"><Building2 className="h-3.5 w-3.5 mt-0.5 text-emerald-300" /> Validado pelo Banco Central</li>
                    </ul>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={closeDialog}>Cancelar</Button>
                    <Button onClick={goToBank}>Ir para o Banco</Button>
                  </DialogFooter>
                </>
              )}
              {step === "redirecting" && (
                <div className="py-10 flex flex-col items-center gap-4 text-center">
                  <div className="relative">
                    <BankLogo bank={active} size={56} />
                    <Loader2 className="absolute -bottom-2 -right-2 h-6 w-6 animate-spin text-purple-300" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Redirecionando para {active.name}…</p>
                    <p className="text-xs text-gray-400 mt-1">Aguardando autorização no ambiente do banco</p>
                  </div>
                </div>
              )}
              {step === "success" && (
                <div className="py-8 flex flex-col items-center gap-4 text-center">
                  <div className="h-14 w-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                    <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-emerald-300 font-semibold">Conexão autorizada com sucesso</p>
                    <p className="text-xs text-gray-400 mt-1">{active.name} foi conectado à sua conta.</p>
                  </div>
                  <Button className="w-full" onClick={closeDialog}>Concluir</Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

