import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const userIdSchema = z.object({ userId: z.string().uuid() });
const roleSchema = z.object({ userId: z.string().uuid(), role: z.enum(["admin", "user"]) });

async function requireAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Response("Acesso administrativo necessário", { status: 403 });
}

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const [{ data: profiles, error: profilesError }, { data: roles, error: rolesError }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, email, name, created_at").order("created_at", { ascending: false }),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);
    if (profilesError || rolesError) throw new Error(profilesError?.message ?? rolesError?.message ?? "Erro ao carregar usuários");
    const adminIds = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
    return (profiles ?? []).map((p) => ({ ...p, role: adminIds.has(p.id) ? "admin" : "user" }));
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => roleSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    if (data.userId === context.userId && data.role === "user") throw new Error("Você não pode remover seu próprio acesso de administrador.");
    if (data.role === "admin") {
      const { error } = await supabaseAdmin.from("user_roles").upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin");
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteUserCompletely = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => userIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    if (data.userId === context.userId) throw new Error("Você não pode excluir a própria conta.");
    const tables = [
      "receivable_payments", "transactions", "holdings_lots", "dividends", "installment_purchases",
      "ongoing_expenses", "receivables", "credit_cards", "accounts", "categories", "user_roles", "profiles",
    ] as const;
    for (const table of tables) {
      const { error } = await (supabaseAdmin.from(table) as any).delete().eq(table === "profiles" ? "id" : "user_id", data.userId);
      if (error) throw new Error(error.message);
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });