const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React from "react";
import { Image } from "@/components/ui/image";

export const LOGO_URL = "https://media.db.com/images/public/6a8b530e52145f428727bb6e/4bc2a0b97_handlis-logga.png";

const SIZES = {
  sm: { box: "w-8 h-8", text: "text-lg" },
  md: { box: "w-9 h-9", text: "text-xl" },
  lg: { box: "w-12 h-12", text: "text-2xl" },
  xl: { box: "w-16 h-16", text: "text-3xl" },
};

export default function Logo({ size = "md", showWord = true, className = "" }) {
  const s = SIZES[size] || SIZES.md;
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Image
        src={LOGO_URL}
        alt="Handlis"
        fittingType="fit"
        className={`${s.box} rounded-xl shrink-0 shadow-sm`}
      />
      {showWord && (
        <span className={`font-heading font-semibold ${s.text} text-foreground`}>Handlis</span>
      )}
    </div>
  );
}