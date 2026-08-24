const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from "react";

import { Search as SearchIcon, Loader2, Store, Tag, AlertCircle, Bell, Check, AlertTriangle, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/handlis";
import { toast } from "@/components/ui/use-toast";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [techError, setTechError] = useState("");
  const [watching, setWatching] = useState({});
  const [watchTarget, setWatchTarget] = useState(null); // index being configured

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setResults(null);
    setTechError("");
    setWatchTarget(null);
    try {
      const res = await db.functions.invoke("searchPrices", { query: query.trim() });
      const data = res?.data || res;
      if (data?.technical_error || data?.error) {
        setTechError(data?.message || data?.error || "Kunde inte söka just nu.");
      } else {
        setResults(data);
      }
    } catch (err) {
      setTechError(err?.message || "Ett tekniskt fel gjorde att vi inte kunde söka just nu. Försök igen senare.");
    } finally {
      setLoading(false);
    }
  };

  const startWatch = (r, i) => {
    setWatchTarget({ index: i, target: r.price, result: r });
  };

  const confirmWatch = async () => {
    const r = watchTarget.result;
    const target = Math.round(parseFloat(watchTarget.target));
    if (!target || target <= 0) {
      toast({ title: "Ange ett giltigt målpris", variant: "destructive" });
      return;
    }
    try {
      await db.entities.PriceWatch.create({
        product_name: r.product_name || query,
        weight: r.weight || "",
        current_price: r.price,
        target_price: target,
        store: r.store || "",
        status: "active",
        last_checked: new Date().toISOString(),
      });
      setWatching((w) => ({ ...w, [r.store + r.product_name + r.price]: true }));
      setWatchTarget(null);
      toast({ title: "Prisbevakning sparad", description: `Vi meddelar dig när ${r.product_name || query} når ${formatCurrency(target)}.` });
    } catch (e) {
      toast({ title: e?.message || "Kunde inte spara bevakning", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-3xl sm:text-4xl font-semibold mb-1">Sök priser</h1>
        <p className="text-muted-foreground text-sm">Jämför aktuella priser från Willys, ICA, Hemköp, Coop, Tempo och Lidl. Handlis hittar aldrig på priser.</p>
      </header>

      <form onSubmit={handleSearch} className="relative max-w-2xl">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="t.ex. Majs"
          className="w-full h-14 pl-12 pr-28 rounded-2xl border border-input bg-card text-base focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
        />
        <Button type="submit" disabled={loading || !query.trim()} className="absolute right-2 top-2 h-10 px-5">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sök"}
        </Button>
      </form>

      {loading && (
        <div className="bg-card rounded-2xl border border-border p-6 flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin text-primary" /> Letar efter verkliga priser hos svenska butiker…
        </div>
      )}

      {!loading && techError && (
        <div className="bg-card rounded-2xl border border-accent/30 p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-accent/12 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-accent" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Kunde inte söka just nu</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">{techError}</p>
          <Button variant="outline" onClick={handleSearch}>Försök igen</Button>
        </div>
      )}

      {!loading && !techError && results && !results.found && (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Vi kunde inte hitta ett aktuellt pris</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">{results.note || "Försök med ett mer specifikt produktnamn, eller kontrollera stavningen."}</p>
        </div>
      )}

      {!loading && !techError && results && results.found && (
        <div>
          <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1.5">
            <Tag className="w-4 h-4" /> {results.product_name || query} · {results.results?.length || 0} träffar
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {results.results?.map((r, i) => {
              const key = r.store + r.product_name + r.price;
              const isWatching = watching[key];
              const configuring = watchTarget?.index === i;
              return (
                <div key={i} className="bg-card rounded-2xl border border-border p-5 flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <Store className="w-4 h-4 text-primary" />
                    <span className="font-semibold">{r.store}</span>
                  </div>
                  <p className="text-sm font-medium mb-0.5">{r.product_name}</p>
                  {r.weight && <p className="text-xs text-muted-foreground mb-1">{r.weight}</p>}
                  {r.compare_price && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                      <Scale className="w-3 h-3" /> Jmf: {r.compare_price}
                    </p>
                  )}
                  {r.offer && <p className="text-xs text-accent font-medium mb-2">{r.offer}</p>}
                  <div className="flex items-end justify-between mt-auto pt-3 border-t border-border">
                    <span className="text-2xl font-heading font-semibold">{formatCurrency(r.price)}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">Kontrollerad {r.checked_at || "idag"}</p>

                  {isWatching ? (
                    <div className="mt-3 flex items-center justify-center gap-1.5 text-sm font-medium text-primary bg-primary/10 rounded-lg py-2">
                      <Check className="w-4 h-4" /> Bevakas
                    </div>
                  ) : configuring ? (
                    <div className="mt-3 space-y-2">
                      <label className="text-[11px] text-muted-foreground">Målpris (kr)</label>
                      <input
                        type="number"
                        value={watchTarget.target}
                        onChange={(e) => setWatchTarget((w) => ({ ...w, target: e.target.value }))}
                        className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1" onClick={confirmWatch}>Spara</Button>
                        <Button size="sm" variant="outline" onClick={() => setWatchTarget(null)}>Avbryt</Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => startWatch(r, i)}>
                      <Bell className="w-4 h-4 mr-1.5" /> Bevaka pris
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && !techError && !results && (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
            <SearchIcon className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Sök efter en produkt</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">Handlis letar efter verkliga aktuella priser och visar vilken butik priset kommer från.</p>
        </div>
      )}
    </div>
  );
}