// Shared hooks for data fetching with realtime
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];

export function useRealtimeQuery<TableName extends keyof T>(
  table: TableName,
  userId: string | undefined,
  build?: (q: any) => any,
) {
  const [data, setData] = useState<T[TableName]["Row"][]>([]);
  const [loading, setLoading] = useState(true);

  // Keep latest build fn in a ref so inline arrows from callers don't
  // retrigger the effect / cause infinite refetch loops.
  const buildRef = useRef(build);
  buildRef.current = build;

  const refetch = useCallback(async () => {
    if (!userId) {
      setData([]);
      setLoading(false);
      return;
    }
    try {
      const client = supabase as any;
      let q = client.from(table).select("*").eq("user_id", userId);
      if (buildRef.current) q = buildRef.current(q);
      const { data, error } = await q;
      if (error) {
        console.error(`[useRealtimeQuery:${String(table)}]`, error.message);
        setData([]);
      } else {
        setData((data ?? []) as any);
      }
    } catch (e: any) {
      console.error(`[useRealtimeQuery:${String(table)}] threw`, e?.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [table, userId]);

  useEffect(() => {
    refetch();
    if (!userId) return;
    const channel = supabase
      .channel(`rt:${String(table)}:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: table as string, filter: `user_id=eq.${userId}` },
        () => refetch(),
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
  (data ?? []).forEach((q) =>
    map.set(q.ticker, {
      price: Number(q.price),
      change_pct: q.change_pct ? Number(q.change_pct) : null,
    }),
  );
  return map;
}
