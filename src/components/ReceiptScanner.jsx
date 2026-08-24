const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Camera, Upload, Loader2, Check, X, Store, Calendar, Clock, Package, Receipt, AlertTriangle } from "lucide-react";
import { Image } from "@/components/ui/image";
import { formatCurrency } from "@/lib/handlis";

// Återanvändbar kvittoskanner. Validerar bilden med LLM-seende, visar godkänt/avvisat,
// och skapar ett köp först när användaren trycker "Lägg till i köphistorik".
export default function ReceiptScanner({ onCompleted }) {
  const [stage, setStage] = useState("idle"); // idle | uploading | analyzing | approved | rejected | saving
  const [imageUrl, setImageUrl] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const reset = () => {
    setStage("idle");
    setImageUrl(null);
    setAnalysis(null);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = async (file) => {
    if (!file) return;
    setError("");
    setStage("uploading");
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file });
      setImageUrl(file_url);
      setStage("analyzing");
      const res = await db.functions.invoke("analyzeReceipt", { image_url: file_url });
      const data = res?.data || res;
      // Tekniskt fel (API-fel, rate limit, integrationsgräns) ska ALDRIG visas som "ogiltigt kvitto".
      if (data?.technical_error || data?.error) {
        setError(data?.message || data?.error || "Ett tekniskt fel gjorde att vi inte kunde analysera kvittot.");
        setStage("error");
        return;
      }
      setAnalysis(data);
      if (data?.is_valid_receipt) {
        setStage("approved");
      } else {
        setStage("rejected");
      }
    } catch (e) {
      // Nätverks-/integrationsfel = tekniskt fel, inte ett dåligt kvitto.
      setError(e?.message || "Ett tekniskt fel gjorde att vi inte kunde analysera kvittot. Försök igen senare.");
      setStage("error");
    }
  };

  const handleAddToHistory = async () => {
    setStage("saving");
    try {
      const a = analysis;
      const dateStr = a.date ? new Date(a.date + (a.time ? "T" + a.time : "T12:00")).toISOString() : new Date().toISOString();
      const items = (a.items || []).map((it) => ({
        name: it.name || "",
        weight: it.weight || "",
        quantity: it.quantity || 1,
        price: typeof it.price === "number" ? it.price : 0,
      }));
      const total = typeof a.total === "number" ? a.total : items.reduce((s, i) => s + i.price, 0);
      await db.entities.Purchase.create({
        store: a.store || "Okänd butik",
        purchase_date: dateStr,
        items,
        total,
        currency: a.currency || "SEK",
        source: "scan",
        receipt_image_url: imageUrl,
        raw_text: a.raw_text || "",
      });
      if (onCompleted) onCompleted();
      reset();
    } catch (e) {
      setError(e?.message || "Kunde inte spara köpet.");
      setStage("approved");
    }
  };

  return (
    <div className="w-full">
      {stage === "idle" && (
        <div className="flex flex-col items-center text-center py-6">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-5">
            <Receipt className="w-9 h-9 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Skanna ditt kvitto</h3>
          <p className="text-muted-foreground text-sm max-w-sm mb-7">
            Ta en tydlig bild av hela kvittot, eller ladda upp en bild från galleriet. Handlis läser av butik, datum, produkter och priser.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            <Button onClick={() => fileRef.current?.click()} className="h-12 flex-1" size="lg">
              <Camera className="w-5 h-5 mr-2" /> Ta bild
            </Button>
            <Button onClick={() => fileRef.current?.click()} variant="outline" className="h-12 flex-1" size="lg">
              <Upload className="w-5 h-5 mr-2" /> Välj bild
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      )}

      {(stage === "uploading" || stage === "analyzing" || stage === "saving") && (
        <div className="flex flex-col items-center text-center py-10">
          {imageUrl && (
            <Image src={imageUrl} alt="Kvitto" fittingType="fill" className="w-32 h-44 rounded-xl mb-5 opacity-70" />
          )}
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground text-sm">
            {stage === "uploading" && "Laddar upp bild…"}
            {stage === "analyzing" && "Handlis läser ditt kvitto…"}
            {stage === "saving" && "Sparar i din köphistorik…"}
          </p>
        </div>
      )}

      {stage === "approved" && analysis && (
        <ApprovedReceipt analysis={analysis} imageUrl={imageUrl} onAdd={handleAddToHistory} onCancel={reset} />
      )}

      {stage === "rejected" && (
        <RejectedReceipt reason={analysis?.rejection_reason || "Vi kunde inte identifiera ett giltigt kvitto i bilden."} onRetry={reset} imageUrl={imageUrl} />
      )}

      {stage === "error" && (
        <ErrorReceipt message={error} onRetry={reset} imageUrl={imageUrl} />
      )}
    </div>
  );
}

// Tekniskt fel – inte samma som ett ogiltigt kvitto. Användaren ska inte tro att kvittot var dåligt.
function ErrorReceipt({ message, onRetry, imageUrl }) {
  return (
    <div className="flex flex-col items-center text-center py-4">
      <div className="w-20 h-20 rounded-full bg-accent/15 flex items-center justify-center mb-5">
        <AlertTriangle className="w-11 h-11 text-accent" strokeWidth={2.5} />
      </div>
      <h3 className="text-2xl font-semibold mb-2">⚠️ Kunde inte kontrollera kvittot just nu</h3>
      <p className="text-muted-foreground text-sm max-w-sm mb-5">
        {message || "Ett tekniskt fel gjorde att vi inte kunde analysera kvittot. Försök igen senare."}
      </p>
      {imageUrl && (
        <Image src={imageUrl} alt="Kvittoförsök" fittingType="fill" className="w-28 h-40 rounded-xl mb-5 opacity-60" />
      )}
      <Button onClick={onRetry} className="h-12 w-full max-w-sm" size="lg">
        Försök igen
      </Button>
    </div>
  );
}

function ApprovedReceipt({ analysis, imageUrl, onAdd, onCancel }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative mb-5">
        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center animate-[pop_0.4s_ease-out]">
          <Check className="w-11 h-11 text-primary-foreground" strokeWidth={3} />
        </div>
      </div>
      <h3 className="text-2xl font-semibold mb-1">✓ Kvitto godkänt</h3>
      <p className="text-muted-foreground text-sm mb-6">Granska uppgifterna innan du lägger till köpet.</p>

      <div className="w-full bg-card rounded-2xl border border-border p-5 mb-5">
        {imageUrl && (
          <Image src={imageUrl} alt="Kvitto" fittingType="fit" className="w-full h-52 rounded-xl mb-4 bg-secondary/40" />
        )}
        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <InfoRow icon={Store} label="Butik" value={analysis.store || "–"} />
          <InfoRow icon={Calendar} label="Datum" value={analysis.date || "–"} />
          <InfoRow icon={Clock} label="Tid" value={analysis.time || "–"} />
          <InfoRow icon={Receipt} label="Totalt" value={formatCurrency(analysis.total)} />
        </div>
        {analysis.items?.length > 0 && (
          <div className="border-t border-border pt-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              <Package className="w-3.5 h-3.5" /> Produkter
            </div>
            <ul className="space-y-2">
              {analysis.items.map((it, i) => (
                <li key={i} className="flex justify-between gap-3 text-sm">
                  <span className="min-w-0">
                    <span className="font-medium">{it.name || "Okänd"}</span>
                    {it.weight && <span className="text-muted-foreground"> · {it.weight}</span>}
                    {it.quantity > 1 && <span className="text-muted-foreground"> · {it.quantity} st</span>}
                  </span>
                  <span className="whitespace-nowrap">{formatCurrency(it.price)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <Button onClick={onAdd} className="h-12 flex-1" size="lg">
          <Check className="w-5 h-5 mr-2" /> Lägg till i köphistorik
        </Button>
        <Button onClick={onCancel} variant="outline" className="h-12 flex-1" size="lg">
          Avbryt
        </Button>
      </div>
    </div>
  );
}

function RejectedReceipt({ reason, onRetry, imageUrl }) {
  return (
    <div className="flex flex-col items-center text-center py-4">
      <div className="w-20 h-20 rounded-full bg-destructive/15 flex items-center justify-center mb-5">
        <X className="w-11 h-11 text-destructive" strokeWidth={3} />
      </div>
      <h3 className="text-2xl font-semibold mb-2">✕ Kvitto ej godkänt</h3>
      <p className="text-muted-foreground text-sm max-w-sm mb-5">{reason}</p>
      {imageUrl && (
        <Image src={imageUrl} alt="Kvittoförsök" fittingType="fill" className="w-28 h-40 rounded-xl mb-5 opacity-60" />
      )}
      <Button onClick={onRetry} className="h-12 w-full max-w-sm" size="lg">
        Försök igen
      </Button>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
        <Icon className="w-3.5 h-3.5" /> {label}
      </span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}