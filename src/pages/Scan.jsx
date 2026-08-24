const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from "react";
import ReceiptScanner from "@/components/ReceiptScanner";
import { useNavigate } from "react-router-dom";
import { Camera, Mail, Plus } from "lucide-react";
import { toast, useToast } from "@/components/ui/use-toast";

export default function Scan() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("scan"); // scan | manual
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCompleted = () => {
    toast({ title: "Köp tillagt i historiken" });
    setRefreshKey((k) => k + 1);
    setTimeout(() => navigate("/history"), 600);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl sm:text-3xl font-semibold mb-1">Lägg till köp</h1>
        <p className="text-muted-foreground text-sm">Skanna ett kvitto eller lägg till ett köp manuellt.</p>
      </div>

      <div className="flex gap-2 mb-6 bg-secondary/70 p-1 rounded-xl w-full max-w-xs">
        <button
          onClick={() => setMode("scan")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${mode === "scan" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
        >
          <Camera className="w-4 h-4" /> Skanna
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${mode === "manual" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
        >
          <Plus className="w-4 h-4" /> Manuellt
        </button>
      </div>

      {mode === "scan" ? (
        <div className="bg-card rounded-3xl border border-border shadow-sm p-6 sm:p-8 max-w-2xl">
          <ReceiptScanner key={refreshKey} onCompleted={handleCompleted} />
        </div>
      ) : (
        <ManualEntry onCompleted={handleCompleted} />
      )}
    </div>
  );
}

function ManualEntry({ onCompleted }) {
  const [store, setStore] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [items, setItems] = useState([{ name: "", weight: "", quantity: 1, price: "" }]);
  const [saving, setSaving] = useState(false);
  const { toast: showToast } = useToast();

  const total = items.reduce((s, i) => s + (parseFloat(i.price) || 0) * (parseFloat(i.quantity) || 1), 0);

  const updateItem = (idx, field, value) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };
  const addItem = () => setItems((prev) => [...prev, { name: "", weight: "", quantity: 1, price: "" }]);
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!store.trim()) return showToast({ title: "Ange en butik", variant: "destructive" });
    if (!items.some((i) => i.name.trim())) return showToast({ title: "Lägg till minst en produkt", variant: "destructive" });
    setSaving(true);
    try {
      const { base44 } = await import("@/api/base44Client");
      await db.entities.Purchase.create({
        store: store.trim(),
        purchase_date: new Date(`${date}T${time || "00:00"}`).toISOString(),
        items: items.filter((i) => i.name.trim()).map((i) => ({
          name: i.name.trim(),
          weight: i.weight.trim(),
          quantity: parseFloat(i.quantity) || 1,
          price: parseFloat(i.price) || 0,
        })),
        total: Math.round(total * 100) / 100,
        currency: "SEK",
        source: "manual",
      });
      onCompleted();
    } catch (e) {
      showToast({ title: e?.message || "Kunde inte spara", variant: "destructive" });
      setSaving(false);
    }
  };

  return (
    <div className="bg-card rounded-3xl border border-border shadow-sm p-6 sm:p-8 max-w-2xl">
      <div className="grid sm:grid-cols-3 gap-4 mb-5">
        <div className="sm:col-span-3">
          <label className="text-sm font-medium mb-1.5 block">Butik</label>
          <input value={store} onChange={(e) => setStore(e.target.value)} placeholder="t.ex. Willys" className="w-full h-11 px-3.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Datum</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full h-11 px-3.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Klockslag</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full h-11 px-3.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {items.map((it, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 items-center">
            <input value={it.name} onChange={(e) => updateItem(idx, "name", e.target.value)} placeholder="Produkt" className="col-span-12 sm:col-span-5 h-11 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            <input value={it.weight} onChange={(e) => updateItem(idx, "weight", e.target.value)} placeholder="Vikt" className="col-span-6 sm:col-span-3 h-11 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            <input type="number" min="1" value={it.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} placeholder="Antal" className="col-span-3 sm:col-span-2 h-11 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            <div className="col-span-2 sm:col-span-1 flex items-center">
              <input type="number" value={it.price} onChange={(e) => updateItem(idx, "price", e.target.value)} placeholder="Pris" className="w-full h-11 px-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="col-span-1 flex justify-center">
              {items.length > 1 && (
                <button onClick={() => removeItem(idx)} className="w-9 h-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center">×</button>
              )}
            </div>
          </div>
        ))}
      </div>

      <button onClick={addItem} className="text-sm font-medium text-primary hover:underline mb-5">+ Lägg till rad</button>

      <div className="flex items-center justify-between border-t border-border pt-4 mb-5">
        <span className="text-sm text-muted-foreground">Totalt</span>
        <span className="text-lg font-semibold">{total.toLocaleString("sv-SE")} kr</span>
      </div>

      <button onClick={handleSave} disabled={saving} className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-60">
        {saving ? "Sparar…" : "Lägg till i köphistorik"}
      </button>
    </div>
  );
}