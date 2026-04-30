// Edge function: search B3 tickers via BRAPI free tier
// GET ?q=PETR -> [{ ticker, name, kind }]
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim().toUpperCase();
    if (q.length < 2) {
      return new Response(JSON.stringify([]), { headers: { ...cors, "content-type": "application/json" } });
    }

    // BRAPI free: list available tickers + filter
    const r = await fetch(`https://brapi.dev/api/available?search=${encodeURIComponent(q)}`);
    if (!r.ok) throw new Error(`BRAPI ${r.status}`);
    const data = await r.json();
    const stocks: string[] = data.stocks ?? [];

    // Take top 20, then fetch quote/longName for the first 8 in parallel
    const candidates = stocks.filter((s) => s.startsWith(q) || s.includes(q)).slice(0, 12);
    const detailed = await Promise.all(
      candidates.slice(0, 8).map(async (ticker) => {
        try {
          const qr = await fetch(`https://brapi.dev/api/quote/${ticker}?range=1d&interval=1d&fundamental=false`);
          if (!qr.ok) return { ticker, name: ticker, kind: guessKind(ticker) };
          const j = await qr.json();
          const result = j.results?.[0];
          return {
            ticker,
            name: result?.longName ?? result?.shortName ?? ticker,
            kind: guessKind(ticker),
            price: result?.regularMarketPrice ?? null,
          };
        } catch {
          return { ticker, name: ticker, kind: guessKind(ticker) };
        }
      })
    );
    // append remaining as bare results
    const rest = candidates.slice(8).map((ticker) => ({ ticker, name: ticker, kind: guessKind(ticker) }));
    return new Response(JSON.stringify([...detailed, ...rest]), {
      headers: { ...cors, "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message) }), {
      status: 500,
      headers: { ...cors, "content-type": "application/json" },
    });
  }
});

function guessKind(ticker: string): "stock" | "fii" {
  // FIIs B3 sempre terminam em 11 e seguem padrão XXXX11
  return /^[A-Z]{4}11$/.test(ticker) ? "fii" : "stock";
}
