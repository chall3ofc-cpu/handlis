const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

// Hjälpfunktioner för webbnotiser (browser Notification API).

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission() {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission; // "default" | "granted" | "denied"
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) return "unsupported";
  try {
    const perm = await Notification.requestPermission();
    return perm; // "granted" | "denied" | "default"
  } catch {
    return "denied";
  }
}

export function canShowBrowserNotification() {
  return notificationsSupported() && Notification.permission === "granted";
}

// Visa en lokal webbnotis. returnerar true om den visades.
export function showBrowserNotification(title, body, opts = {}) {
  if (!canShowBrowserNotification()) return false;
  try {
    const n = new Notification(title, {
      body,
      icon: "https://media.db.com/images/public/6a8b530e52145f428727bb6e/4bc2a0b97_handlis-logga.png",
      tag: opts.tag,
      data: opts.data,
    });
    if (opts.onClick) n.onclick = () => opts.onClick();
    return true;
  } catch {
    return false;
  }
}