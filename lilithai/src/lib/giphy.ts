import { request } from "undici";

const KEY = process.env.GIPHY_API_KEY;

if (!KEY) {
  console.warn("[lilithai] GIPHY_API_KEY missing — GIF features will be limited.");
}

const cache = new Map<string, { ts: number; urls: string[] }>();
const CACHE_TTL = 60 * 60 * 1000;

interface GiphyData {
  images?: { original?: { url?: string }; downsized_large?: { url?: string } };
}

interface GiphyResponse {
  data?: GiphyData[];
}

export async function searchGifs(query: string, limit = 15): Promise<string[]> {
  if (!KEY) return [];
  const key = query.toLowerCase().trim();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.urls;
  try {
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(
      KEY,
    )}&q=${encodeURIComponent(query)}&limit=${limit}&rating=pg-13&lang=en`;
    const res = await request(url, { method: "GET" });
    if (res.statusCode >= 400) {
      console.warn("[giphy] http", res.statusCode);
      return [];
    }
    const json = (await res.body.json()) as GiphyResponse;
    const urls: string[] = (json.data ?? [])
      .map((d) => d.images?.downsized_large?.url ?? d.images?.original?.url ?? "")
      .filter((u) => u.length > 0);
    cache.set(key, { ts: Date.now(), urls });
    return urls;
  } catch (e) {
    console.warn("[giphy] error", e);
    return [];
  }
}

export async function randomGif(query: string): Promise<string | null> {
  const urls = await searchGifs(query);
  if (urls.length === 0) return null;
  const idx = Math.floor(Math.random() * urls.length);
  return urls[idx] ?? null;
}

const AESTHETIC_QUERIES: Record<string, string[]> = {
  entry: ["dark aesthetic", "neon entrance", "anime entrance", "mysterious smoke"],
  vibe: ["aesthetic anime", "neon glitch", "moody sparkle", "purple aesthetic"],
  hype: ["evil laugh", "anime power up", "neon hype", "fire reaction"],
  story: ["dark fantasy", "horror suspense", "anime mystery", "neon noir"],
  bye: ["anime wave goodbye", "cat wave", "vanish smoke", "peace out anime"],
  chaos: ["chaos meme", "anime explosion", "glitch chaos", "evil laugh"],
};

export async function aestheticGif(mood: keyof typeof AESTHETIC_QUERIES): Promise<string | null> {
  const queries = AESTHETIC_QUERIES[mood] ?? AESTHETIC_QUERIES.vibe!;
  const q = queries[Math.floor(Math.random() * queries.length)]!;
  return randomGif(q);
}
