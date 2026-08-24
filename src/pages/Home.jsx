const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useCallback } from "react";

import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingDown, RefreshCw, Store, Clock, Package, Wallet, ArrowRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DiscoveredPurchases from "@/components/DiscoveredPurchases";
import { aggregateProducts, recurringProducts, totalSpent, purchasesByStore, formatCurrency, relativeTime } from "@/lib/handlis";

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const loadPurchases = useCallback(async () => {
    try {
      const list = await db.entities.Purchase.list("-purchase_date", 100);
      setPurchases(list || []);
    } catch {
      setPurchases([]);
    }
  }, []);

  useEffect(() => { loadPurchases(); }, [loadPurchases]);

  const products = purchases ? aggregateProducts(purchases) : [];
  const recurring = purchases ? recurringProducts(purchases) : [];
  const enoughData = products.length >= 2;

  const loadInsights = useCallback(async () => {
    if (recurring.length === 0) return;
    setLoadingInsights(true);
    try {
      const payload = recurring.map((p) => ({ name: p.name, weight: p.weight, usual_price: p.usualPrice, usual_store: p.usualStore }));
      const res = await db.functions.invoke("generateInsights", { products: payload });
      const data = res?.data || res;
      if (data?.technical_error || data?.error) {
        setInsights({ insights: [], summary: data?.message || "Kunde inte hämta aktuella priser just nu. Försök igen senare." });
      } else {
        setInsights(data);
      }
    } catch {
      setInsights({ insights: [], summary: "Kunde inte hämta aktuella priser just nu. Försök igen senare." });
    } finally {
      setLoadingInsights(false);
    }
  }, [recurring]);

  useEffect(() => {
    if (enoughData && insights === null) loadInsights();
  }, [enoughData, insights, loadInsights]);

  const firstName = user?.full_name?.split(" ")[0] || "du";

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-muted-foreground">{greeting()}</p>
        <h1 className="font-heading text-3xl sm:text-4xl font-semibold mt-1">Hej, {firstName} 👋</h1>
      </header>

      {/* Upptäckta digitala kvitton (kräver godkännande) */}
      <DiscoveredPurchases />

      {/* Besparingsinsikter (live) */}
      <section>
        <SectionHeader icon={Sparkles} title="Besparingar just nu" action={enoughData ? (
          <Button variant="ghost" size="sm" onClick={loadInsights} disabled={loadingInsights} className="text-muted-foreground">
            {loadingInsights ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span className="ml-1.5 hidden sm:inline">Uppdatera</span>
          </Button>
        ) : null} />

        {!enoughData ? (
          <EmptyState
            title="Handlis lär fortfarande känna dina köp"
            text="Lägg till fler köp så kan Handlis börja leta efter billigare priser och prisfall åt dig."
            action={<Button onClick={() => navigate("/scan")} className="mt-1"><Package className="w-4 h-4 mr-2" /> Lägg till köp</Button>}
          />
        ) : loadingInsights && !insights ? (
          <LoadingCard text="Letar efter billigare priser på dina vanliga produkter…" />
        ) : insights?.insights?.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {insights.insights.map((ins, i) => (
              <InsightCard key={i} ins={ins} />
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border p-5 text-sm text-muted-foreground">
            {insights?.summary || "Inga prisfall hittades just nu på dina vanliga produkter. Handlis kollar riktiga priser – hittar vi inget säger vi det hellre än att gissa."}
          </div>
        )}
      </section>

      {/* Dina prisminnen */}
      {products.length > 0 && (
        <section>
          <SectionHeader icon={Wallet} title="Dina prisminnen" action={
            <button onClick={() => navigate("/products")} className="text-sm font-medium text-primary flex items-center gap-1 hover:underline">
              Alla <ArrowRight className="w-4 h-4" />
            </button>
          } />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {products.slice(0, 6).map((p, i) => (
              <ProductMemoryCard key={i} p={p} />
            ))}
          </div>
        </section>
      )}

      {/* Återkommande köp + butiker */}
      {purchases && purchases.length > 0 && (
        <section className="grid lg:grid-cols-2 gap-5">
          <div>
            <SectionHeader icon={Clock} title="Återkommande köp" />
            {recurring.length > 0 ? (
              <div className="bg-card rounded-2xl border border-border divide-y divide-border">
                {recurring.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-4">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{p.name}{p.weight && <span className="text-muted-foreground"> · {p.weight}</span>}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.frequencyDays ? `Köps ungefär var ${p.frequencyDays}:e dag` : `Köpt ${p.timesBought} gång(er)`} · senast {relativeTime(p.lastDate)}
                      </p>
                    </div>
                    <span className="text-sm font-medium whitespace-nowrap">{formatCurrency(p.usualPrice)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-2xl border border-border p-5 text-sm text-muted-foreground">
                Lägg till samma produkt fler gånger så ser du här hur ofta du brukar köpa den.
              </div>
            )}
          </div>
          <div>
            <SectionHeader icon={Store} title="Var du handlar" />
            <StoreBreakdown purchases={purchases} />
          </div>
        </section>
      )}
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return "God natt";
  if (h < 12) return "God morgon";
  if (h < 18) return "God eftermiddag";
  return "God kväll";
}

function SectionHeader({ icon: Icon, title, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-heading text-xl font-semibold flex items-center gap-2">
        <Icon className="w-5 h-5 text-primary" /> {title}
      </h2>
      {action}
    </div>
  );
}

function InsightCard({ ins }) {
  const savings = typeof ins.savings === "number" ? ins.savings : (ins.usual_price - ins.current_price);
  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-start gap-2 mb-2">
        <span className="w-8 h-8 rounded-lg bg-primary/12 flex items-center justify-center shrink-0">
          <TrendingDown className="w-4 h-4 text-primary" />
        </span>
        <p className="text-sm leading-relaxed">{ins.message || `${ins.product} kostar nu ${formatCurrency(ins.current_price)} på ${ins.current_store} – ${formatCurrency(savings)} billigare.`}</p>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
        <Store className="w-3.5 h-3.5" />
        {ins.current_store || "Butik"} · kontrollerad {ins.checked_at || "idag"}
      </div>
    </div>
  );
}

function ProductMemoryCard({ p }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      <p className="font-medium text-sm mb-1 truncate">{p.name}</p>
      {p.weight && <p className="text-xs text-muted-foreground mb-3">{p.weight}</p>}
      <div className="space-y-1.5 text-xs">
        <PriceRow label="Vanligt pris" value={formatCurrency(p.usualPrice)} />
        <PriceRow label="Snittpris" value={formatCurrency(p.avgPrice)} />
        <PriceRow label="Lägst registrerat" value={formatCurrency(p.lowestPrice)} highlight />
      </div>
    </div>
  );
}

function PriceRow({ label, value, highlight }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? "font-semibold text-primary" : "font-medium"}>{value}</span>
    </div>
  );
}

function StoreBreakdown({ purchases }) {
  const stores = purchasesByStore(purchases).slice(0, 5);
  const max = stores[0]?.total || 1;
  if (stores.length === 0) return <div className="bg-card rounded-2xl border border-border p-5 text-sm text-muted-foreground">Inga butiker ännu.</div>;
  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
      {stores.map((s, i) => (
        <div key={i}>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">{s.store}</span>
            <span className="text-muted-foreground">{formatCurrency(s.total)}</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full bg-accent" style={{ width: `${(s.total / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadingCard({ text }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-6 flex items-center gap-3 text-sm text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin text-primary" /> {text}
    </div>
  );
}

function EmptyState({ title, text, action }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
        <Sparkles className="w-7 h-7 text-primary" />
      </div>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">{text}</p>
      {action}
    </div>
  );
}