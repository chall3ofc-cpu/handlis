const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useCallback } from "react";

import { History as HistoryIcon, Store, Calendar, Clock, Trash2, ChevronDown, Receipt, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime, formatDate } from "@/lib/handlis";
import { toast } from "@/components/ui/use-toast";

export default function HistoryPage() {
  const [purchases, setPurchases] = useState(null);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    try {
      const list = await db.entities.Purchase.list("-purchase_date", 200);
      setPurchases(list || []);
    } catch {
      setPurchases([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    try {
      await db.entities.Purchase.delete(id);
      toast({ title: "Köpt bort från historiken" });
      setPurchases((prev) => (prev || []).filter((p) => p.id !== id));
      setOpenId(null);
    } catch (e) {
      toast({ title: e?.message || "Kunde inte ta bort", variant: "destructive" });
    }
  };

  if (purchases === null) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-heading text-3xl sm:text-4xl font-semibold mb-1">Köphistorik</h1>
        <p className="text-muted-foreground text-sm">Alla köp du har godkänt. Endast du ser dessa.</p>
      </header>

      {purchases.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
            <HistoryIcon className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Inga köp än</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">Lägg till ditt första köp så hamnar det här.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {purchases.map((p) => (
            <div key={p.id} className="bg-card rounded-2xl border border-border overflow-hidden">
              <button
                onClick={() => setOpenId(openId === p.id ? null : p.id)}
                className="w-full flex items-center gap-4 p-4 text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Store className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{p.store}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> {formatDate(p.purchase_date)}
                    {p.items?.length > 0 && <><span>·</span><Package className="w-3.5 h-3.5" /> {p.items.length} produkter</>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold">{formatCurrency(p.total)}</p>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground ml-auto mt-1 transition-transform ${openId === p.id ? "rotate-180" : ""}`} />
                </div>
              </button>

              {openId === p.id && (
                <div className="border-t border-border px-4 py-4 bg-secondary/30">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                    <Clock className="w-3.5 h-3.5" /> {formatDateTime(p.purchase_date)}
                    <span>·</span> Källa: {p.source === "scan" ? "Skannat kvitto" : p.source === "email" ? "Digitalt kvitto" : "Manuellt"}
                  </div>
                  {p.items?.length > 0 ? (
                    <ul className="space-y-2 mb-4">
                      {p.items.map((it, i) => (
                        <li key={i} className="flex justify-between gap-3 text-sm">
                          <span className="min-w-0">
                            <span className="font-medium">{it.name}</span>
                            {it.weight && <span className="text-muted-foreground"> · {it.weight}</span>}
                            {it.quantity > 1 && <span className="text-muted-foreground"> · {it.quantity} st</span>}
                          </span>
                          <span className="whitespace-nowrap">{formatCurrency(it.price)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-4">Inga produktrader registrerade.</p>
                  )}
                  <div className="flex justify-between items-center border-t border-border pt-3 mb-4">
                    <span className="text-sm font-medium">Totalt</span>
                    <span className="font-semibold">{formatCurrency(p.total)}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(p.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" /> Ta bort köp
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}