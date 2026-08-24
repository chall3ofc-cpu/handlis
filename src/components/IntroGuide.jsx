const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Home, Search, Plus, History, User, X } from "lucide-react";

const STEPS = [
  { icon: Home, title: "Hem", text: "Här hittar Handlis automatiskt saker som kan hjälpa dig spara pengar – prisfall, billigare alternativ och erbjudanden." },
  { icon: Search, title: "Sök", text: "Sök efter produkter och jämför aktuella priser från riktiga butiker. Handlis hittar aldrig på priser." },
  { icon: Plus, title: "+", text: "Lägg till nya köp genom att skanna kvitton. Det är så Handlis lär sig dina vanor." },
  { icon: History, title: "Historik", text: "Se alla köp du har godkänt. Öppna ett köp för detaljer eller ta bort det." },
  { icon: User, title: "Profil", text: "Inställningar, statistik, integritet och ditt Handlis-minne – du bestämmer vad Handlis får lära sig." },
];

export default function IntroGuide() {
  const { user } = useAuth();
  const [open, setOpen] = useState(!user?.intro_guide_seen);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  if (!open) return null;

  const finish = async (skipped) => {
    try {
      await db.auth.updateMe({ intro_guide_seen: true });
    } catch {}
    setOpen(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish(false);
  };

  const s = STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card rounded-3xl shadow-2xl border border-border p-7 animate-[pop_0.3s_ease-out]">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Introduktion · {step + 1}/{STEPS.length}
          </span>
          <button onClick={() => finish(true)} className="text-muted-foreground hover:text-foreground p-1 -mr-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center text-center py-5">
          <div className="w-16 h-16 rounded-2xl bg-primary/12 flex items-center justify-center mb-4">
            <s.icon className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-2xl font-semibold mb-2">{s.title}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">{s.text}</p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => finish(true)} className="text-muted-foreground">
            Hoppa över
          </Button>
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-1.5 bg-border"}`} />
            ))}
          </div>
          <Button onClick={next}>
            {step < STEPS.length - 1 ? "Nästa" : "Kom igång"}
          </Button>
        </div>
      </div>
    </div>
  );
}