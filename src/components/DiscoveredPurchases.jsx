const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useCallback } from "react";

import { Store, Calendar, Check, X, Loader2, Mail, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime } from "@/lib/handlis";
import { toast } from "@/components/ui/use-toast";

// Visar DIGITALA KVITTON som upptäckts i användarens inkorg och ännu inte godkänts.
// Inget läggs till i köphistoriken förrän användaren trycker "Lägg till i köphistorik".
export default function DiscoveredPurchases() {
  const [items, setItems] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [busy, setBusy] = useState({});

  const load = useCallback(async () => {
    try {
      const list = await db.entities.DiscoveredPurchase.filter({ status: "pending" }, "-created_date", 20);
      setItems(list || []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (d) => {
    setBusy((b) => ({ ...b, [d.id]: "approve" }));
    try {
      await db.entities.Purchase.create({
        store: d.store,
        purchase_date: d.purchase_date,
        items: d.items || [],
        total: d.total,
        currency: d.currency || "SEK",
        source: "email",
        raw_text: d.raw_text || "",
      });
      await db.entities.DiscoveredPurchase.update(d.id, { status: "approved" });
      await db.entities.Notification.create({
        type: "discovered_receipt",
        title: "Köp tillagt",
        body: `${d.store} (${formatCurrency(d.total)}) lades till i din historik.`,
        read: true,
      });
      setItems((prev) => (prev || []).filter((x) => x.id !== d.id));
      toast({ title: "Köp tillagt i historiken" });
    } catch (e) {
      toast({ title: e?.message || "Kunde inte lägga till köpet", variant: "destructive" });
    } finally {
      setBusy((b) => ({ ...b, [d.id]: null }));
    }
  };

  const ignore = async (d) => {
    setBusy((b) => ({ ...b, [d.id]: "ignore" }));
    try {
      await db.entities.DiscoveredPurchase.update(d.id, { status: "ignored" });
      setItems((prev) => (prev || []).filter((x) => x.id !== d.id));
      toast({ title: "Köpet ignorerat" });
    } catch (e) {
      toast({ title: e?.message || "Kunde inte ignorera", variant: "destructive" });
    } finally {
      setBusy((b) => ({ ...b, [d.id]: null }));
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <section>
      <h2 className="font-heading text-xl font-semibold flex items-center gap-2 mb-3">
        <Mail className="w-5 h-5 text-primary" /> Upptäckta köp
      </h2>
      <div className="space-y-2.5">
        {items.map((d) => (
          <div key={d.id} className="bg-card rounded-2xl border border-accent/30 overflow-hidden">
            <button onClick={() => setOpenId(openId === d.id ? null : d.id)} className="w-full flex items-center gap-4 p-4 text-left">
              <div className="w-11 h-11 rounded-xl bg-accent/15 flex items-center justify-center shrink-0 text-lg">🛍️</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{d.store}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> {formatDateTime(d.purchase_date)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold">{formatCurrency(d.total)}</p>
                <ChevronDown className={`w-4 h-4 text-muted-foreground ml-auto mt-1 transition-transform ${openId === d.id ? "rotate-180" : ""}`} />
              </div>
            </button>

            {openId === d.id && (
              <div className="border-t border-border px-4 py-4 bg-secondary/30">
                {d.items?.length > 0 && (
                  <ul className="space-y-1.5 mb-3">
                    {d.items.map((it, i) => (
                      <li key={i} className="flex justify-between gap-3 text-sm">
                        <span className="min-w-0">{it.name}{it.weight && <span className="text-muted-foreground"> · {it.weight}</span>}</span>
                        <span className="whitespace-nowrap">{formatCurrency(it.price)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-muted-foreground mb-3">Upptäckt i din inkorg. Inget läggs till i din historik förrän du godkänner det.</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button size="sm" className="flex-1" onClick={() => approve(d)} disabled={!!busy[d.id]}>
                    {busy[d.id] === "approve" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                    Lägg till i köphistorik
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => ignore(d)} disabled={!!busy[d.id]}>
                    {busy[d.id] === "ignore" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <X className="w-4 h-4 mr-2" />}
                    Ignorera
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}