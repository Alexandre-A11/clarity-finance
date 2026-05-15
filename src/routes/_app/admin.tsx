import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRole } from "@/lib/use-role";
import { deleteUserCompletely, listAdminUsers, updateUserRole } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users, UserPlus, ShieldCheck, MoreHorizontal, Trash2, Shield } from "lucide-react";
import { fmtDate } from "@/lib/finance";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin")({
  component: AdminPage,
});

type ProfileRow = {
  id: string;
  email: string | null;
  name: string | null;
  role: "admin" | "user";
  created_at: string;
};

function AdminPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useRole();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<ProfileRow | null>(null);

  // Guard: redirect non-admins
  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      nav({ to: "/" });
    }
  }, [roleLoading, isAdmin, nav]);

  const refetch = async () => {
    setLoading(true);
    try {
      const data = await listAdminUsers();
      console.info("[admin] listAdminUsers ok:", Array.isArray(data) ? data.length : 0);
      setProfiles(Array.isArray(data) ? (data as ProfileRow[]) : []);
    } catch (error: any) {
      const status = error?.status ?? error?.response?.status;
      console.error("[admin] listAdminUsers failed", { status, error });
      toast.error(
        status === 401
          ? "Sessão expirada. Faça login novamente."
          : status === 403
            ? "Acesso negado. Você precisa ser administrador."
            : "Não foi possível carregar usuários",
      );
      setProfiles([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) refetch();
  }, [isAdmin]);

  const kpis = useMemo(() => {
    const list = Array.isArray(profiles) ? profiles : [];
    const total = list.length;
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = list.filter((p) => new Date(p.created_at).getTime() >= cutoff).length;
    const admins = list.filter((p) => p.role === "admin").length;
    return { total, recent, admins };
  }, [profiles]);

  if (roleLoading || !isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const setRole = async (p: ProfileRow, role: "admin" | "user") => {
    if (p.id === user?.id && role === "user") {
      toast.error("Você não pode remover seu próprio acesso de administrador.");
      return;
    }
    try {
      await updateUserRole({ data: { userId: p.id, role } });
      toast.success(role === "admin" ? "Usuário promovido a admin" : "Cargo atualizado");
      refetch();
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível atualizar o cargo");
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    if (pendingDelete.id === user?.id) {
      toast.error("Você não pode excluir o próprio perfil.");
      setPendingDelete(null);
      return;
    }
    try {
      await deleteUserCompletely({ data: { userId: pendingDelete.id } });
      toast.success("Conta excluída completamente");
      refetch();
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível excluir a conta");
    }
    setPendingDelete(null);
  };

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1400px] mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Administração</h1>
        <p className="text-muted-foreground mt-1">Gestão de usuários e permissões</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <KPI label="Total de usuários" value={String(kpis.total)} icon={Users} />
        <KPI label="Novos (7 dias)" value={String(kpis.recent)} icon={UserPlus} />
        <KPI label="Administradores" value={String(kpis.admins)} icon={ShieldCheck} />
      </div>

      <Card className="shadow-soft overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium">Usuários</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{profiles.length} cadastrado{profiles.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : profiles.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Nenhum usuário encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Email</th>
                  <th className="text-left px-6 py-3 font-medium">Nome</th>
                  <th className="text-left px-6 py-3 font-medium">Criado em</th>
                  <th className="text-left px-6 py-3 font-medium">Cargo</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {profiles.map((p) => {
                  const isMe = p.id === user?.id;
                  const isAdminRow = p.role === "admin";
                  return (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-6 py-3">
                        <span className="font-medium">{p.email ?? "—"}</span>
                        {isMe && <span className="ml-2 text-[10px] uppercase tracking-wide text-primary">você</span>}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">{p.name ?? "—"}</td>
                      <td className="px-6 py-3 text-muted-foreground tabular">{fmtDate(p.created_at)}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${isAdminRow ? "bg-primary-soft text-primary" : "bg-secondary text-muted-foreground"}`}>
                          {isAdminRow && <Shield className="h-3 w-3" />}
                          {isAdminRow ? "Admin" : "Usuário"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {isAdminRow ? (
                              <DropdownMenuItem onClick={() => setRole(p, "user")} disabled={isMe}>
                                <Shield className="h-4 w-4 mr-2" />
                                Rebaixar para usuário
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => setRole(p, "admin")}>
                                <ShieldCheck className="h-4 w-4 mr-2" />
                                Tornar Admin
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => setPendingDelete(p)}
                              disabled={isMe}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir conta
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove a conta de <strong>{pendingDelete?.email ?? "—"}</strong>, incluindo
              login e dados financeiros. Depois disso, o mesmo e-mail poderá ser cadastrado novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir conta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function KPI({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular tracking-tight">{value}</p>
        </div>
        <div className="h-9 w-9 rounded-lg bg-primary-soft flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
    </Card>
  );
}
