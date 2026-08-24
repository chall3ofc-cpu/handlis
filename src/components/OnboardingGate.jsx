const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";

import Onboarding from "@/pages/Onboarding";

// Blockerar hela appen tills användaren har skapat sitt första godkända köp.
// Oavsett vilken route användaren försöker nå visas onboarding tills ett köp finns.
export default function OnboardingGate() {
  const [status, setStatus] = useState("loading"); // loading | pending | done
  const [purchases, setPurchases] = useState([]);

  const loadPurchases = async () => {
    try {
      const list = await db.entities.Purchase.list("-created_date", 50);
      setPurchases(list || []);
      setStatus((list || []).length > 0 ? "done" : "pending");
    } catch {
      setStatus("pending");
    }
  };

  useEffect(() => {
    loadPurchases();
  }, []);

  if (status === "loading") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "pending") {
    return <Onboarding onCompleted={loadPurchases} />;
  }

  return <Outlet />;
}