import React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Home, Search, Plus, History, User } from "lucide-react";
import Logo from "@/components/Logo";
import NotificationCenter from "@/components/NotificationCenter";
import IntroGuide from "@/components/IntroGuide";

const NAV = [
  { to: "/", label: "Hem", icon: Home },
  { to: "/search", label: "Sök", icon: Search },
  { to: "/history", label: "Historik", icon: History },
  { to: "/profile", label: "Profil", icon: User },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <IntroGuide />

      {/* Desktop-sidomeny */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-border bg-sidebar px-5 py-7">
        <div className="px-2 mb-10">
          <Logo size="md" />
        </div>
        <nav className="flex flex-col gap-1.5 flex-1">
          {NAV.map((item) => {
            const active = location.pathname === item.to;
            return (
              <button
                key={item.to}
                onClick={() => navigate(item.to)}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-colors ${
                  active ? "bg-primary text-primary-foreground shadow-sm" : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="mb-3">
          <NotificationCenter variant="sidebar" />
        </div>
        <button
          onClick={() => navigate("/scan")}
          className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-accent text-accent-foreground font-medium shadow-sm hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" /> Skanna kvitto
        </button>
      </aside>

      {/* Mobil/surfplatta topprad */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-background/90 backdrop-blur border-b border-border">
        <Logo size="md" />
        <div className="flex items-center gap-2">
          <NotificationCenter variant="header" />
          <button
            onClick={() => navigate("/profile")}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
          >
            <User className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </header>

      {/* Huvudinnehåll */}
      <main className="lg:pl-64 pb-24 lg:pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-5 lg:py-8">
          <Outlet />
        </div>
      </main>

      {/* Mobil botten-navigation */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur border-t border-border px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {NAV.slice(0, 2).map((item) => <NavButton key={item.to} item={item} active={location.pathname === item.to} />)}
          <button
            onClick={() => navigate("/scan")}
            className="flex flex-col items-center -mt-6"
          >
            <span className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30 border-4 border-card">
              <Plus className="w-7 h-7 text-primary-foreground" />
            </span>
          </button>
          {NAV.slice(2).map((item) => <NavButton key={item.to} item={item} active={location.pathname === item.to} />)}
        </div>
      </nav>
    </div>
  );
}

function NavButton({ item, active }) {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(item.to)} className="flex flex-col items-center gap-1 px-2 py-1 min-w-[56px]">
      <item.icon className={`w-6 h-6 ${active ? "text-primary" : "text-muted-foreground"}`} />
      <span className={`text-[11px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>{item.label}</span>
    </button>
  );
}