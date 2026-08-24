import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import ReceiptScanner from "@/components/ReceiptScanner";
import { Sparkles } from "lucide-react";

// Obligatorisk onboarding. Visas av OnboardingGate tills användaren har sitt första godkända köp.
export default function Onboarding({ onCompleted }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [done, setDone] = useState(false);

  const handleCompleted = () => {
    setDone(true);
    onCompleted?.();
    // När grinden uppdateras och släpper igen, gå till Hem.
    setTimeout(() => navigate("/"), 400);
  };

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mb-5 animate-[pop_0.4s_ease-out]">
          <Sparkles className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-semibold mb-2">Välkommen, {user?.full_name?.split(" ")[0] || "vän"}!</h1>
        <p className="text-muted-foreground text-sm">Nu börjar Handlis lära känna dina köp…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <div className="text-center mb-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-xs font-medium text-muted-foreground mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Steg 2 av 2
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-semibold mb-3">Skanna ditt första kvitto</h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
              För att Handlis ska kunna hjälpa dig spara pengar behöver vi börja med ett riktigt köp. Detta steg går inte att hoppa över.
            </p>
          </div>

          <div className="bg-card rounded-3xl border border-border shadow-sm p-6 sm:p-8">
            <ReceiptScanner onCompleted={handleCompleted} />
          </div>

          <p className="text-center text-xs text-muted-foreground mt-5 max-w-sm mx-auto">
            Handlis lagrar bara köp du själv godkänner. Du kan alltid ta bort köp i din historik.
          </p>
        </div>
      </div>
    </div>
  );
}