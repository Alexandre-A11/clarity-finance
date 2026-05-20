import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRole } from "@/lib/use-role";
import { usePrivacy } from "@/lib/privacy-context";
import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  Repeat,
  TrendingUp,
  FileText,
  History,
  LogOut,
  Sparkles,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { to: "/transacoes", label: "Transações", icon: ArrowLeftRight, adminOnly: false },
  { to: "/cartoes", label: "Cartões", icon: CreditCard, adminOnly: false },
  { to: "/continuas", label: "Despesas fixas", icon: Repeat, adminOnly: false },
  { to: "/historico", label: "Histórico", icon: History, adminOnly: false },
  { to: "/investimentos", label: "Investimentos", icon: TrendingUp, adminOnly: false },
  { to: "/irpf", label: "IRPF", icon: FileText, adminOnly: false },
  { to: "/admin", label: "Administração", icon: ShieldCheck, adminOnly: true },
] as const;

function AppLayout() {
  const { user, loading, signOut } = useAuth();
  const { isAdmin } = useRole();
  const { hidden, toggle } = usePrivacy();
  const nav = useNavigate();
  const loc = useLocation();
  const visibleNav = NAV.filter((n) => !n.adminOnly || isAdmin);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const initials = (user.email ?? "U").slice(0, 2).toUpperCase();

  return (
    <div className="relative min-h-screen flex">
      {/* Ambient orbs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full bg-purple-900/30 blur-[120px]" />
        <div className="absolute top-1/3 -right-32 h-[480px] w-[480px] rounded-full bg-emerald-900/20 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-cyan-900/20 blur-[120px]" />
      </div>

      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col glass-strong m-3 rounded-2xl sticky top-3 h-[calc(100vh-1.5rem)] fade-up">
        <div className="px-5 py-5 flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center logo-glow">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <p className="font-semibold tracking-tight text-white">Finanças</p>
            <p className="text-[10px] uppercase tracking-widest text-gray-400">Premium</p>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {visibleNav.map((item, idx) => {
            const active =
              item.to === "/"
                ? loc.pathname === "/"
                : loc.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                style={{ animationDelay: `${idx * 40}ms` }}
                className={cn(
                  "fade-up group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
                  active
                    ? "bg-white/10 text-white font-medium border border-white/10 shadow-[0_0_20px_-8px_rgba(168,85,247,0.6)]"
                    : "text-gray-400 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className={cn("h-4 w-4 transition-colors", active ? "text-purple-300" : "text-gray-500 group-hover:text-white")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-2.5 px-2 py-2 mb-2">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-xs font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-gray-500">Conectado</p>
              <p className="text-xs font-medium text-white truncate">{user.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-gray-400 hover:text-white hover:bg-white/5"
            onClick={toggle}
          >
            {hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {hidden ? "Mostrar valores" : "Modo privacidade"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-gray-400 hover:text-white hover:bg-white/5"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 glass-strong flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center logo-glow">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-sm text-white">Finanças</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white" onClick={toggle}>
            {hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white" onClick={() => signOut()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-strong flex justify-around z-40">
        {visibleNav.slice(0, 5).map((item) => {
          const active = item.to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to} className={cn("flex-1 flex flex-col items-center py-2 text-[10px] transition-colors", active ? "text-purple-300" : "text-gray-500")}>
              <Icon className="h-5 w-5 mb-0.5" />
              {item.label.split(" ")[0]}
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 min-w-0 pt-14 md:pt-0 pb-20 md:pb-0">
        <div className="max-w-[1500px] mx-auto p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
