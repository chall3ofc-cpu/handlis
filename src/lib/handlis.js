// Delade hjälpfunktioner för Handlis

export function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) return "–";
  const n = Number(value);
  return n.toLocaleString("sv-SE", { maximumFractionDigits: n % 1 === 0 ? 0 : 2 }) + " kr";
}

export function formatDate(dateStr) {
  if (!dateStr) return "–";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr) {
  if (!dateStr) return "–";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" }) + " · " +
      d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return dateStr;
  }
}

export function relativeTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "idag";
  if (days === 1) return "igår";
  if (days < 30) return `för ${days} dagar sedan`;
  const months = Math.floor(days / 30);
  return `för ${months} mån sedan`;
}

// Normalisera produktnamn för aggregering
function normalizeName(name) {
  return (name || "").trim().toLowerCase().replace(/\s+/g, " ");
}

// Aggregera användarens köp till en produktlista med prisminne
export function aggregateProducts(purchases) {
  const map = new Map();
  for (const p of purchases || []) {
    for (const item of p.items || []) {
      if (!item.name) continue;
      const key = normalizeName(item.name) + "|" + (item.weight || "");
      if (!map.has(key)) {
        map.set(key, {
          name: item.name.trim(),
          weight: item.weight || "",
          prices: [],
          stores: {},
          dates: [],
          count: 0,
        });
      }
      const entry = map.get(key);
      if (typeof item.price === "number") entry.prices.push(item.price);
      if (p.store) entry.stores[p.store] = (entry.stores[p.store] || 0) + 1;
      if (p.purchase_date) entry.dates.push(new Date(p.purchase_date).getTime());
      entry.count += item.quantity || 1;
    }
  }

  const products = [];
  for (const entry of map.values()) {
    if (entry.prices.length === 0) continue;
    const usualStore = Object.entries(entry.stores).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
    const usualPrice = entry.prices[entry.prices.length - 1];
    const avgPrice = entry.prices.reduce((a, b) => a + b, 0) / entry.prices.length;
    const lowestPrice = Math.min(...entry.prices);
    const highestPrice = Math.max(...entry.prices);
    entry.dates.sort((a, b) => a - b);
    let frequencyDays = null;
    if (entry.dates.length >= 2) {
      const span = (entry.dates[entry.dates.length - 1] - entry.dates[0]) / 86400000;
      frequencyDays = Math.round(span / (entry.dates.length - 1));
    }
    products.push({
      name: entry.name,
      weight: entry.weight,
      usualPrice,
      avgPrice: Math.round(avgPrice * 100) / 100,
      lowestPrice,
      highestPrice,
      usualStore,
      purchaseCount: entry.count,
      timesBought: entry.dates.length,
      lastDate: entry.dates[entry.dates.length - 1] ? new Date(entry.dates[entry.dates.length - 1]).toISOString() : null,
      frequencyDays,
    });
  }
  products.sort((a, b) => b.timesBought - a.timesBought || b.purchaseCount - a.purchaseCount);
  return products;
}

// Återkommande produkter (köpta fler än en gång) för insikter
export function recurringProducts(purchases) {
  return aggregateProducts(purchases).filter((p) => p.timesBought >= 1 && p.usualPrice > 0).slice(0, 6);
}

export function totalSpent(purchases) {
  return (purchases || []).reduce((sum, p) => sum + (typeof p.total === "number" ? p.total : 0), 0);
}

export function purchasesByStore(purchases) {
  const map = {};
  for (const p of purchases || []) {
    if (!p.store) continue;
    map[p.store] = (map[p.store] || 0) + (typeof p.total === "number" ? p.total : 0);
  }
  return Object.entries(map).map(([store, total]) => ({ store, total })).sort((a, b) => b.total - a.total);
}