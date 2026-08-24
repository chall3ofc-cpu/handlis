const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useCallback } from "react";

import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  BarChart3, Brain, Mail, Shield, HelpCircle, BookOpen, LogOut,
  Store, Package, Trash2, Bell, BellOff, Loader2, ChevronRight, AlertTriangle,
  Crown, RefreshCw, Check, Sparkles, TrendingDown
} from "lucide-react";
import { aggregateProducts, purchasesByStore, totalSpent, formatCurrency } from "@/lib/handlis";
import { toast } from "@/components/ui/use-toast";
import {
  notificationsSupported, notificationPermission, requestNotificationPermission, showBrowserNotification
} from "@/lib/notifications";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState(null);
  const [watches, setWatches] = useState(null);
  const [openSection, setOpenSection] = useState(null);

  const load = useCallback(async () => {
    try {
      const [p, w] = await Promise.all([
        db.entities.Purchase.list("-purchase_date", 200),
        db.entities.PriceWatch.list("-created_date", 50),
      ]);
      setPurchases(p || []);
      setWatches(w || []);
    } catch { setPurchases([]); setWatches([]); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const products = purchases ? aggregateProducts(purchases) : [];
  const stores = purchases ? purchasesByStore(purchases) : [];
  const spent = totalSpent(purchases || []);

  const handleLogout = () => logout();

  const reopenGuide = async () => {
    try {
      await db.auth.updateMe({ intro_guide_seen: false });
      window.location.reload();
    } catch (e) {
      toast({ title: "Kunde inte öppna guiden", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <header className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-sm">
          <span className="text-primary-foreground font-heading font-bold text-2xl">
            {(user?.full_name?.[0] || user?.email?.[0] || "H").toUpperCase()}
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-semibold">{user?.full_name || "Din profil"}</h1>
            {user?.is_premium && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/15 text-accent text-xs font-semibold">
                <Crown className="w-3.5 h-3.5" /> Handlis+
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </header>

      {/* Handlis+ Premium */}
      <PremiumSection isPremium={user?.is_premium} premiumSince={user?.premium_since} />

      {/* Statistik */}
      <Section icon={BarChart3} title="Statistik" open={openSection === "stats"} onToggle={() => setOpenSection(openSection === "stats" ? null : "stats")}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <Stat label="Totalt spenderat" value={formatCurrency(spent)} />
          <Stat label="Antal köp" value={(purchases || []).length} />
          <Stat label="Unika produkter" value={products.length} />
          <Stat label="Prisbevakningar" value={(watches || []).length} />
        </div>
        {stores.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Var du handlar mest</p>
            <div className="space-y-1.5">
              {stores.slice(0, 5).map((s, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5"><Store className="w-4 h-4 text-muted-foreground" /> {s.store}</span>
                  <span className="font-medium">{formatCurrency(s.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Mitt minne */}
      <Section icon={Brain} title="Mitt minne" open={openSection === "memory"} onToggle={() => setOpenSection(openSection === "memory" ? null : "memory")}>
        <p className="text-sm text-muted-foreground mb-4">Handlis lär sig av dig – men du bestämmer vad Handlis får lära sig. Ta bort något så glömmer Handlis det.</p>
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">Handlis har inte lärt sig några mönster än.</p>
        ) : (
          <>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Favoritprodukter</p>
            <div className="space-y-2 mb-5">
              {products.slice(0, 6).map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{p.name}{p.weight && <span className="text-muted-foreground"> · {p.weight}</span>}</span>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{p.timesBought} köp · {formatCurrency(p.usualPrice)}</span>
                </div>
              ))}
            </div>
          </>
        )}
        {stores.length > 0 && (
          <>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Vanliga butiker</p>
            <div className="space-y-1.5 mb-5">
              {stores.slice(0, 4).map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Store className="w-4 h-4 text-muted-foreground" /> {s.store}
                </div>
              ))}
            </div>
          </>
        )}
        <Button variant="outline" size="sm" onClick={() => navigate("/products")} className="w-full sm:w-auto">
          Se alla produkter
        </Button>
      </Section>

      {/* Prisbevakningar */}
      <Section icon={Bell} title="Prisbevakningar" open={openSection === "watches"} onToggle={() => setOpenSection(openSection === "watches" ? null : "watches")}>
        {watches === null ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : watches.length === 0 ? (
          <p className="text-sm text-muted-foreground">Du har inga aktiva prisbevakningar. Sök efter en produkt och tryck "Bevaka pris" för att börja.</p>
        ) : (
          <div className="space-y-2">
            {watches.map((w) => (
              <WatchRow key={w.id} w={w} user={user} onUpdated={() => load()} onDeleted={() => setWatches((prev) => prev.filter((x) => x.id !== w.id))} />
            ))}
          </div>
        )}
      </Section>

      {/* Notiser */}
      <Section icon={Bell} title="Notiser" open={openSection === "notifications"} onToggle={() => setOpenSection(openSection === "notifications" ? null : "notifications")}>
        <NotificationsSection user={user} />
      </Section>

      {/* Kopplad e-post */}
      <Section icon={Mail} title="Digitala kvitton via e-post" open={openSection === "email"} onToggle={() => setOpenSection(openSection === "email" ? null : "email")}>
        <EmailConnection user={user} />
      </Section>

      {/* Integritet */}
      <Section icon={Shield} title="Integritet" open={openSection === "privacy"} onToggle={() => setOpenSection(openSection === "privacy" ? null : "privacy")}>
        <PrivacySection purchases={purchases} watches={watches} onCleared={load} />
      </Section>

      {/* Hjälp */}
      <Section icon={HelpCircle} title="Hjälp" open={openSection === "help"} onToggle={() => setOpenSection(openSection === "help" ? null : "help")}>
        <HelpContent />
      </Section>

      {/* Introduktionsguide */}
      <button
        onClick={reopenGuide}
        className="w-full flex items-center gap-3 p-4 bg-card rounded-2xl border border-border hover:bg-secondary/50 transition-colors text-left"
      >
        <span className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center"><BookOpen className="w-5 h-5 text-foreground" /></span>
        <div className="flex-1">
          <p className="font-medium">Visa introduktionsguiden igen</p>
          <p className="text-xs text-muted-foreground">Lär känna Handlis på nytt</p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </button>

      {/* Logga ut */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center gap-3 p-4 bg-card rounded-2xl border border-border hover:bg-destructive/5 transition-colors text-left"
      >
        <span className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center"><LogOut className="w-5 h-5 text-destructive" /></span>
        <div className="flex-1">
          <p className="font-medium text-destructive">Logga ut</p>
          <p className="text-xs text-muted-foreground">Du loggas ut från Handlis</p>
        </div>
      </button>

      <p className="text-center text-xs text-muted-foreground pt-2">Handlis · din personliga köp- och sparassistent</p>
    </div>
  );
}

function Section({ icon: Icon, title, open, onToggle, children }) {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-4 text-left">
        <span className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center"><Icon className="w-5 h-5 text-foreground" /></span>
        <span className="flex-1 font-semibold">{title}</span>
        <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && <div className="px-4 pb-5 pt-1">{children}</div>}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-secondary/50 rounded-xl p-3">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="font-heading text-lg font-semibold">{value}</p>
    </div>
  );
}

function WatchRow({ w, user, onUpdated, onDeleted }) {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  const remove = async () => {
    setLoading(true);
    try {
      await db.entities.PriceWatch.delete(w.id);
      onDeleted();
      toast({ title: "Bevakning borttagen" });
    } catch (e) {
      toast({ title: e?.message || "Kunde inte ta bort", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const checkNow = async () => {
    setChecking(true);
    try {
      const q = [w.product_name, w.weight].filter(Boolean).join(" ");
      const res = await db.functions.invoke("searchPrices", { query: q });
      const data = res?.data || res;
      if (data?.technical_error || data?.error) {
        toast({ title: data?.message || "Kunde inte kontrollera priset just nu", variant: "destructive" });
        return;
      }
      const best = data?.results?.sort((a, b) => a.price - b.price)[0];
      if (!data?.found || !best) {
        toast({ title: "Hittade inget aktuellt pris just nu", description: "Handlis gissar aldrig – försök igen senare." });
        return;
      }
      const hit = best.price <= (w.target_price ?? 0);
      await db.entities.PriceWatch.update(w.id, {
        current_price: best.price,
        store: best.store || w.store || "",
        last_checked: new Date().toISOString(),
        status: hit ? "triggered" : "active",
      });
      if (hit) {
        await db.entities.Notification.create({
          type: "price_drop",
          title: "🔔 Prisfall",
          body: `${w.product_name}${w.weight ? " " + w.weight : ""} kostar nu ${best.price} kr på ${best.store}. Ditt målpris var ${w.target_price} kr.`,
          related_id: w.id,
          read: false,
        });
        if (user?.notifications_enabled) {
          showBrowserNotification("🔔 Prisfall på " + w.product_name, `Produkten kostar nu ${best.price} kr på ${best.store}.`);
        }
        toast({ title: "🔔 Prisfall!", description: `${w.product_name} kostar nu ${best.price} kr på ${best.store}.` });
      } else {
        toast({ title: "Priset uppdaterat", description: `Just nu ${best.price} kr på ${best.store} – ännu under ditt målpris ${w.target_price} kr.` });
      }
      onUpdated();
    } catch (e) {
      toast({ title: e?.message || "Kunde inte kontrollera priset", variant: "destructive" });
    } finally { setChecking(false); }
  };

  return (
    <div className="flex items-start justify-between gap-3 p-3 bg-secondary/40 rounded-xl">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{w.product_name}{w.weight && <span className="text-muted-foreground"> · {w.weight}</span>}</p>
        <p className="text-xs text-muted-foreground">
          Nu: {w.current_price != null ? formatCurrency(w.current_price) : "–"} → Mål: {formatCurrency(w.target_price)}
          {w.store && ` · ${w.store}`}
        </p>
        {w.status === "triggered" && (
          <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-primary">
            <TrendingDown className="w-3.5 h-3.5" /> Målpris nått!
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5 shrink-0">
        <button
          onClick={checkNow}
          disabled={checking}
          title="Kolla aktuellt pris nu"
          className="w-8 h-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 flex items-center justify-center"
        >
          {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
        <button onClick={remove} disabled={loading} className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function NotificationsSection({ user }) {
  const [enabled, setEnabled] = useState(!!user?.notifications_enabled);
  const [perm, setPerm] = useState(notificationPermission());
  const [busy, setBusy] = useState(false);

  const supported = notificationsSupported();

  const toggle = async (checked) => {
    if (checked) {
      if (!supported) {
        toast({ title: "Webbnotiser stöds inte i den här webbläsaren", variant: "destructive" });
        return;
      }
      setBusy(true);
      const result = await requestNotificationPermission();
      setPerm(result);
      setBusy(false);
      if (result !== "granted") {
        toast({ title: "Notiser inte tillåtna", description: "Tillåt notiser i webbläsaren för att få prisfall på skärmen.", variant: "destructive" });
        return;
      }
      setEnabled(true);
      await db.auth.updateMe({ notifications_enabled: true });
      toast({ title: "Notiser aktiverade", description: "Du får nu ett meddelande på skärmen när en prisbevakning trigglas." });
    } else {
      setEnabled(false);
      await db.auth.updateMe({ notifications_enabled: false });
      toast({ title: "Notiser avstängda" });
    }
  };

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">Få ett meddelande på skärmen när en prisbevakning når ditt målpris. Handlis ber om tillåtelse i webbläsaren första gången du slår på notiser.</p>
      {!supported && (
        <div className="bg-secondary/40 rounded-xl p-3 mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <BellOff className="w-4 h-4" /> Webbläsaren stöder inte push-notiser.
        </div>
      )}
      <div className="flex items-center justify-between p-3 bg-secondary/40 rounded-xl">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-lg bg-card flex items-center justify-center">
            {enabled ? <Bell className="w-4 h-4 text-primary" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
          </span>
          <div>
            <p className="text-sm font-medium">Skärmnotiser</p>
            <p className="text-xs text-muted-foreground">
              {supported ? (perm === "granted" ? "Tillåtna" : perm === "denied" ? "Blockerade i webbläsaren" : "Ej tillåtna ännu") : "Stöds ej"}
            </p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={toggle} disabled={busy || !supported} />
      </div>
      {perm === "denied" && supported && (
        <p className="text-xs text-muted-foreground mt-2">Du har blockerat notiser i webbläsaren. Ändra det i webbläsarens inställningar för att slå på dem igen.</p>
      )}
    </div>
  );
}

function EmailConnection({ user }) {
  const [email, setEmail] = useState(user?.connected_email || user?.email || "");
  const [editing, setEditing] = useState(!user?.email_connected);
  const [connecting, setConnecting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const connected = user?.email_connected;

  const connect = async () => {
    if (!email.trim()) return toast({ title: "Ange en e-postadress", variant: "destructive" });
    setConnecting(true);
    try {
      await db.auth.updateMe({ email_connected: true, connected_email: email.trim() });
      toast({ title: "E-post kopplad", description: "Handlis letar efter digitala kvitton. Upptäckta köp visas alltid för ditt godkännande." });
      setEditing(false);
      setTimeout(() => window.location.reload(), 900);
    } catch (e) {
      toast({ title: e?.message || "Kunde inte koppla e-post", variant: "destructive" });
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    setConnecting(true);
    try {
      await db.auth.updateMe({ email_connected: false, connected_email: "" });
      toast({ title: "E-post frånkopplad" });
      setEmail("");
      setEditing(true);
      setTimeout(() => window.location.reload(), 900);
    } catch (e) {
      toast({ title: e?.message || "Kunde inte koppla från", variant: "destructive" });
      setConnecting(false);
    }
  };

  const scanNow = async () => {
    setScanning(true);
    try {
      const res = await db.functions.invoke("discoverEmailReceipts", {});
      const data = res?.data || res;
      toast({ title: data?.message || "Klar", description: data?.discovered ? `${data.discovered} upptäckta köp.` : undefined });
    } catch (e) {
      toast({ title: e?.message || "Kunde inte läsa inkorgen just nu", variant: "destructive" });
    } finally { setScanning(false); }
  };

  if (connected && !editing) {
    return (
      <div>
        <div className="flex items-center gap-2 text-sm mb-3">
          <span className="w-2 h-2 rounded-full bg-primary" />
          E-post kopplad: <span className="font-medium">{user?.connected_email || user?.email}</span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">När Handlis upptäcker ett digitalt kvitto visas det för dig. Inget läggs till i din historik utan ditt godkännande.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={scanNow} disabled={scanning}>
            {scanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
            {scanning ? "Söker…" : "Sök efter digitala kvitton"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Byt e-post</Button>
          <Button variant="outline" size="sm" onClick={disconnect} disabled={connecting} className="text-destructive hover:text-destructive">Koppla från</Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {connected && (
        <p className="text-sm text-muted-foreground mb-3">Kopplad till <span className="font-medium">{user?.connected_email}</span>. Byt till en annan adress nedan.</p>
      )}
      <label className="text-sm font-medium mb-1.5 block">E-postadress</label>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="din.adress@example.com"
          className="flex-1 h-11 px-3.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="flex gap-2">
          {connected && (
            <Button variant="outline" onClick={() => setEditing(false)}>Avbryt</Button>
          )}
          <Button onClick={connect} disabled={connecting}>
            {connecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {connected ? "Byt" : "Koppla min e-post"}
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-3">Automatisk skanning av inkorgen kräver att du ansluter ditt Google-konto i nästa steg. Handlis läser aldrig eller lägger till något utan ditt godkännande.</p>
    </div>
  );
}

function PrivacySection({ purchases, watches, onCleared }) {
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);

  const clearAll = async () => {
    setClearing(true);
    try {
      await db.entities.Purchase.deleteMany({});
      await db.entities.PriceWatch.deleteMany({});
      toast({ title: "All din data är raderad" });
      onCleared();
      setConfirming(false);
    } catch (e) {
      toast({ title: e?.message || "Kunde inte radera", variant: "destructive" });
    } finally { setClearing(false); }
  };

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">Alla köp och prisbevakningar tillhör endast dig. Du kan när som helst ta bort enskilda köp i historiken, eller radera all din data nedan.</p>
      {!confirming ? (
        <Button variant="outline" onClick={() => setConfirming(true)} className="text-destructive hover:text-destructive">
          <Trash2 className="w-4 h-4 mr-2" /> Radera all min data
        </Button>
      ) : (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
          <div className="flex items-start gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm">Detta raderar alla dina {purchases?.length || 0} köp och {watches?.length || 0} prisbevakningar permanent. Det går inte att ångra.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="destructive" onClick={clearAll} disabled={clearing}>
              {clearing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Ja, radera allt
            </Button>
            <Button variant="outline" onClick={() => setConfirming(false)}>Avbryt</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PremiumSection({ isPremium, premiumSince }) {
  const [modal, setModal] = useState(false);

  const benefits = [
    "Offline-läge – nå tidigare hämtade köp och produkter utan internet",
    "Utökad köphistorik utan begränsningar",
    "Mer avancerad prisanalys och trender",
    "Fler prisbevakningar",
    "Djupare personliga köpinsikter",
    "Prioriterade prisuppdateringar",
  ];

  if (isPremium) {
    return (
      <div className="bg-gradient-to-br from-accent/15 to-primary/10 rounded-2xl border border-accent/30 p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-11 h-11 rounded-xl bg-accent text-accent-foreground flex items-center justify-center"><Crown className="w-6 h-6" /></span>
          <div>
            <h2 className="font-heading text-xl font-semibold flex items-center gap-2">Handlis+ <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">Aktiv</span></h2>
            <p className="text-xs text-muted-foreground">{premiumSince ? `Aktiverad ${new Date(premiumSince).toLocaleDateString("sv-SE")}` : "Tack för att du stödjer Handlis!"}</p>
          </div>
        </div>
        <ul className="space-y-1.5 mb-1">
          {benefits.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" /> {b}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-accent/15 to-primary/10 rounded-2xl border border-accent/30 p-5">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-11 h-11 rounded-xl bg-accent text-accent-foreground flex items-center justify-center"><Crown className="w-6 h-6" /></span>
        <div>
          <h2 className="font-heading text-xl font-semibold">Handlis+</h2>
          <p className="text-xs text-muted-foreground">Få mer ut av Handlis.</p>
        </div>
        <span className="ml-auto font-heading text-xl font-semibold">49 kr<span className="text-sm font-body text-muted-foreground">/månad</span></span>
      </div>
      <ul className="space-y-1.5 mb-4">
        {benefits.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" /> {b}
          </li>
        ))}
      </ul>
      <Button className="w-full sm:w-auto" onClick={() => setModal(true)}>
        <Crown className="w-4 h-4 mr-2" /> Uppgradera till Handlis+
      </Button>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4" onClick={() => setModal(false)}>
          <div className="w-full max-w-md bg-card rounded-3xl border border-border shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-11 h-11 rounded-xl bg-accent text-accent-foreground flex items-center justify-center"><Crown className="w-6 h-6" /></span>
              <div>
                <h3 className="font-heading text-xl font-semibold">Handlis+</h3>
                <p className="text-xs text-muted-foreground">49 kr/månad</p>
              </div>
            </div>
            <ul className="space-y-1.5 mb-5">
              {benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm"><Check className="w-4 h-4 text-primary shrink-0 mt-0.5" /> {b}</li>
              ))}
            </ul>
            <div className="bg-secondary/50 rounded-xl p-3 mb-4 text-sm text-muted-foreground">
              Kortbetalning (Stripe) aktiveras snart. Tills dess går det inte att slutföra köpet – gratisversionen fungerar som vanligt. Hör av dig till Handlis när betalningen är redo.
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" disabled>Betalning aktiveras snart</Button>
              <Button variant="outline" onClick={() => setModal(false)}>Stäng</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HelpContent() {
  const faqs = [
    { q: "Hur lägger jag till ett köp?", a: "Tryck på + i navigationen och skanna ett kvitto, eller lägg till ett köp manuellt med butik, datum och klockslag. Handlis läser av butik, datum, produkter och priser från kvittot." },
    { q: "Läggs köp till automatiskt?", a: "Nej. Inget köp läggs till i din historik utan att du godkänner det – varken från skannade kvitton eller digitala kvitton via e-post." },
    { q: "Varifrån kommer priserna i söken?", a: "Handlis hämtar verkliga aktuella priser från svenska butikers webbplatser (Willys, ICA, Hemköp, Coop, Tempo, Lidl m.fl.). Handlis hittar aldrig på eller uppskattar priser. Om ett pris inte kan hittas säger vi det." },
    { q: "Fungerar prisbevakning på riktigt?", a: "Ja. När du bevakar en produkt sparas den på ditt konto. Tryck 'Kolla nu' på en bevakning för att hämta aktuellt pris – når det ditt målpris skapas en notis och (om du slagit på notiser) ett meddelande på skärmen." },
    { q: "Vad är Handlis-minne?", a: "Det är vad Handlis har lärt sig om dina köpvanor – favoritprodukter, vanliga butiker och köpmönster. Du kan ta bort information när du vill." },
    { q: "Kan jag ta bort mina uppgifter?", a: "Ja. Du kan ta bort enskilda köp i historiken eller radera all din data under Integritet." },
  ];
  return (
    <div className="space-y-3">
      {faqs.map((f, i) => (
        <details key={i} className="group">
          <summary className="flex items-center justify-between cursor-pointer list-none py-1 text-sm font-medium">
            {f.q}
            <ChevronRight className="w-4 h-4 text-muted-foreground group-open:rotate-90 transition-transform" />
          </summary>
          <p className="text-sm text-muted-foreground mt-1.5 mb-2 leading-relaxed">{f.a}</p>
        </details>
      ))}
    </div>
  );
}