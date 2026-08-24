const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useCallback } from "react";

import { useNavigate } from "react-router-dom";
import { Package, Store, TrendingDown, Clock, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { aggregateProducts, formatCurrency, relativeTime } from "@/lib/handlis";

export default function Products() {
  const [purchases, setPurchases] = useState(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const list = await db.entities.Purchase.list("-purchase_date", 200);
      setPurchases(list || []);
    } catch { setPurchases([]); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const products = purchases ? aggregateProducts(purchases) : [];

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate(-1)} className="text-sm text-muted-foreground hover:text-foreground mb-1">← Tillbaka</button>
          <h1 className="font-heading text-3xl sm:text-4xl font-semibold">Mina produkter</h1>
          <p className="text-muted-foreground text-sm">Ditt personliga prisminne – baserat på dina godkända köp.</p>
        </div>
      </header>

      {purchases === null ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" /></div>
      ) : products.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
            <Package className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Inga produkter än</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">Lägg till köp så bygger Handlis ett prisminne för varje produkt du köper.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map((p, i) => (
            <ProductCard key={i} p={p} onSearch={() => navigate("/search")} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({ p, onSearch }) {
  const [live, setLive] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkPrice = async () => {
    setLoading(true);
    setLive(null);
    try {
      const q = p.weight ? `${p.name} ${p.weight}` : p.name;
      const res = await db.functions.invoke("searchPrices", { query: q });
      const data = res?.data || res;
      if (data?.technical_error || data?.error) {
        setLive({ found: false, note: data?.message || "Kunde inte söka just nu. Försök igen senare." });
      } else {
        setLive(data);
      }
    } catch {
      setLive({ found: false, note: "Kunde inte söka just nu. Försök igen senare." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-start gap-2 mb-3">
        <span className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
          <Package className="w-4 h-4 text-muted-foreground" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-sm leading-tight">{p.name}</p>
          {p.weight && <p className="text-xs text-muted-foreground">{p.weight}</p>}
        </div>
      </div>

      <div className="space-y-1.5 text-xs mb-3">
        <Row label="Vanligt pris" value={formatCurrency(p.usualPrice)} />
        <Row label="Snittpris" value={formatCurrency(p.avgPrice)} />
        <Row label="Lägst registrerat" value={formatCurrency(p.lowestPrice)} highlight />
        <Row label="Högst registrerat" value={formatCurrency(p.highestPrice)} />
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3 pb-3 border-t border-border pt-3">
        <Clock className="w-3.5 h-3.5" />
        {p.frequencyDays ? `Var ${p.frequencyDays}:e dag` : `${p.timesBought} köp`} · senast {relativeTime(p.lastDate)}
      </div>
      {p.usualStore && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          <Store className="w-3.5 h-3.5" /> Oftast på {p.usualStore}
        </div>
      )}

      <Button variant="outline" size="sm" className="w-full" onClick={checkPrice} disabled={loading}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Search className="w-4 h-4 mr-1.5" />}
        Kolla aktuellt pris
      </Button>

      {live && live.found && live.results?.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Aktuella priser</p>
          {live.results.slice(0, 3).map((r, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{r.store}</span>
              <span className="font-medium">{formatCurrency(r.price)}</span>
            </div>
          ))}
        </div>
      )}
      {live && !live.found && (
        <p className="text-xs text-muted-foreground mt-3">{live.note || "Inget aktuellt pris hittades."}</p>
      )}
    </div>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? "font-semibold text-primary" : "font-medium"}>{value}</span>
    </div>
  );
}