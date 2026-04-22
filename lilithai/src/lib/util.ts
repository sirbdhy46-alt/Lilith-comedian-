export function pick<T>(arr: T[]): T {
  if (arr.length === 0) throw new Error("pick from empty array");
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

export function clampLength(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

export function normalizeIcetea(text: string): string {
  return text.replace(/\bice\s*tea\b/gi, "Ice Tea").replace(/\bicetea\b/gi, "Ice Tea");
}

export function escapeMd(s: string): string {
  return s.replace(/([_*`~|])/g, "\\$1");
}

export function fmtMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d) return `${d}d ${h % 24}h`;
  if (h) return `${h}h ${m % 60}m`;
  if (m) return `${m}m ${s % 60}s`;
  return `${s}s`;
}
