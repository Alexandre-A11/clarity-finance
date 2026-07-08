import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Wallet, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

type Mode = "auth" | "recover-email" | "recover-otp" | "recover-password";

function AuthPage() {
  const { user, loading, signIn, signUp } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>("auth");
  const [tab, setTab] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  // recovery state
  const [recEmail, setRecEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  useEffect(() => {
    if (!loading && user && mode === "auth") nav({ to: "/" });
  }, [user, loading, nav, mode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } =
      tab === "signin"
        ? await signIn(email, password)
        : await signUp(email, password, name || email.split("@")[0]);
    setBusy(false);
    if (error) toast.error(error);
    else {
      toast.success(tab === "signin" ? "Bem-vindo de volta!" : "Conta criada!");
      nav({ to: "/" });
    }
  };

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recEmail) return;
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(recEmail);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Código enviado para o seu e-mail.");
    setMode("recover-otp");
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error("Digite os 6 dígitos.");
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      email: recEmail,
      token: otp,
      type: "recovery",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Código verificado.");
    setMode("recover-password");
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 6) return toast.error("A senha deve ter ao menos 6 caracteres.");
    if (newPass !== confirmPass) return toast.error("As senhas não coincidem.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }
    await supabase.auth.signOut();
    setBusy(false);
    toast.success("Senha redefinida com sucesso!");
    setRecEmail("");
    setOtp("");
    setNewPass("");
    setConfirmPass("");
    setMode("auth");
    setTab("signin");
  };

  const backToAuth = () => {
    setMode("auth");
    setOtp("");
    setNewPass("");
    setConfirmPass("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 font-sans">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <Wallet className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-2xl font-semibold tracking-tight">Finanças</span>
        </div>

        <Card className="p-6 shadow-card">
          {mode === "auth" && (
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar conta</TabsTrigger>
              </TabsList>
              <form onSubmit={submit} className="space-y-4">
                <TabsContent value="signup" className="space-y-4 mt-0">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="João" />
                  </div>
                </TabsContent>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    {tab === "signin" && (
                      <button
                        type="button"
                        onClick={() => {
                          setRecEmail(email);
                          setMode("recover-email");
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Esqueci minha senha
                      </button>
                    )}
                  </div>
                  <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Aguarde..." : tab === "signin" ? "Entrar" : "Criar conta"}
                </Button>
              </form>
            </Tabs>
          )}

          {mode === "recover-email" && (
            <form onSubmit={sendCode} className="space-y-4">
              <button type="button" onClick={backToAuth} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" /> Voltar
              </button>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Recuperar conta</h2>
                <p className="text-sm text-muted-foreground mt-1">Informe o e-mail cadastrado para receber o código de verificação.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rec-email">E-mail de cadastro</Label>
                <Input id="rec-email" type="email" required value={recEmail} onChange={(e) => setRecEmail(e.target.value)} placeholder="voce@email.com" />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Enviando..." : "Enviar código"}
              </Button>
            </form>
          )}

          {mode === "recover-otp" && (
            <form onSubmit={verifyCode} className="space-y-4">
              <button type="button" onClick={() => setMode("recover-email")} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" /> Voltar
              </button>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Verificar código</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Enviamos um código de 6 dígitos para <span className="text-foreground font-medium">{recEmail}</span>.
                </p>
              </div>
              <div className="flex justify-center py-2">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button type="submit" className="w-full" disabled={busy || otp.length !== 6}>
                {busy ? "Verificando..." : "Verificar código"}
              </Button>
              <button
                type="button"
                onClick={sendCode as unknown as () => void}
                className="w-full text-xs text-muted-foreground hover:text-foreground"
              >
                Reenviar código
              </button>
            </form>
          )}

          {mode === "recover-password" && (
            <form onSubmit={resetPassword} className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Definir nova senha</h2>
                <p className="text-sm text-muted-foreground mt-1">Escolha uma senha forte com no mínimo 6 caracteres.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-pass">Nova senha</Label>
                <Input id="new-pass" type="password" required minLength={6} value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-pass">Confirmar nova senha</Label>
                <Input id="confirm-pass" type="password" required minLength={6} value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} placeholder="••••••••" />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Salvando..." : "Redefinir senha"}
              </Button>
            </form>
          )}
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Seus dados são sincronizados em tempo real entre todos os seus dispositivos.
        </p>
      </div>
    </div>
  );
}
