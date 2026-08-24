const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useCallback, useRef } from "react";

import { Bell, CheckCheck, BellOff, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { relativeTime } from "@/lib/handlis";

export default function NotificationCenter({ variant = "sidebar" }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const panelRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const list = await db.entities.Notification.list("-created_date", 20);
      setItems(list || []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
    const unsub = db.entities.Notification.subscribe(() => load());
    return unsub;
  }, [load]);

  // Click outside stänger panelen
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unread = (items || []).filter((n) => !n.read).length;

  const markAllRead = async () => {
    const unreadItems = (items || []).filter((n) => !n.read);
    if (unreadItems.length === 0) return;
    try {
      await db.entities.Notification.bulkUpdate(unreadItems.map((n) => ({ id: n.id, read: true })));
      setItems((prev) => (prev || []).map((n) => ({ ...n, read: true })));
    } catch {}
  };

  const handleOpen = async () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && items === null) {
      setLoading(true);
      await load();
      setLoading(false);
    }
  };

  const isHeader = variant === "header";

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        aria-label="Notiser"
        className={`relative ${isHeader ? "w-9 h-9 rounded-full bg-secondary" : "w-10 h-10 rounded-xl bg-secondary"} flex items-center justify-center hover:bg-secondary/70 transition-colors`}
      >
        <Bell className={`${isHeader ? "w-5 h-5" : "w-5 h-5"} text-foreground`} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center border-2 border-card">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute z-50 bg-card rounded-2xl border border-border shadow-xl overflow-hidden ${
            isHeader ? "top-11 right-0 w-80" : "bottom-12 left-0 w-80"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-semibold text-sm">Notiser</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline flex items-center gap-1">
                <CheckCheck className="w-3.5 h-3.5" /> Markera lästa
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && items === null ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : (items || []).length === 0 ? (
              <div className="flex flex-col items-center text-center py-8 px-4">
                <BellOff className="w-7 h-7 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Inga notiser än.</p>
                <p className="text-xs text-muted-foreground mt-1">Prisbevakningar och upptäckta kvitton dyker upp här.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => (
                  <li
                    key={n.id}
                    onClick={() => { setOpen(false); navigate("/profile"); }}
                    className={`px-4 py-3 cursor-pointer hover:bg-secondary/40 ${!n.read ? "bg-primary/5" : ""}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-base">{n.type === "price_drop" ? "🔔" : n.type === "discovered_receipt" ? "🛍️" : "•"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug">{n.title}</p>
                        {n.body && <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{n.body}</p>}
                        <p className="text-[11px] text-muted-foreground mt-1">{relativeTime(n.created_date)}</p>
                      </div>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1.5" />}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}