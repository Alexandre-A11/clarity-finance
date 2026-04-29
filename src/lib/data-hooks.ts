// Shared hooks for data fetching with realtime
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];

export function useRealtimeQuery<TableName extends keyof T>(
  table: TableName,
  userId: string | undefined,
  build?: (q: any) => any
) {
  const [data, setData] = useState<T[TableName]["Row"][]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId) return;
    let q: any = supabase.from(table as string).select("*").eq("user_id", userId);
    if (build) q = build(q);
    const { data, error } = await q;
    if (!error) setData((data ?? []) as any);
    setLoading(false);
  }, [table, userId, build]);

  useEffect(() => {
    refetch();
    if (!userId) return;
    const channel = supabase
      .channel(`rt:${String(table)}:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: table as string, filter: `user_id=eq.${userId}` },
        () => refetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch, table, userId]);

  return { data, loading, refetch };
}

export async function fetchAssets() {
  const { data } = await supabase.from("assets").select("*").order("ticker");
  return data ?? [];
}

export async function fetchQuotes() {
  const { data } = await supabase.from("quotes_cache").select("*");
  const map = new Map<string, { price: number; change_pct: number | null }>();
  (data ?? []).forEach((q) => map.set(q.ticker, { price: Number(q.price), change_pct: q.change_pct ? Number(q.change_pct) : null }));
  return map;
}
