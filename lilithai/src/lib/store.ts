import { promises as fs } from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve(process.cwd(), "bot/lilithai/data");
const STATS_FILE = path.join(DATA_DIR, "stats.json");

export interface UserStats {
  userId: string;
  username: string;
  rating: number;
  wins: number;
  losses: number;
  gamesPlayed: number;
  lastSeen: number;
}

interface Store {
  users: Record<string, UserStats>;
  greetings: Record<string, string[]>;
}

let cache: Store | null = null;
let writeQueue: Promise<void> = Promise.resolve();

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function load(): Promise<Store> {
  if (cache) return cache;
  await ensureDir();
  try {
    const raw = await fs.readFile(STATS_FILE, "utf8");
    cache = JSON.parse(raw) as Store;
  } catch {
    cache = { users: {}, greetings: {} };
  }
  if (!cache.users) cache.users = {};
  if (!cache.greetings) cache.greetings = {};
  return cache;
}

async function persist() {
  if (!cache) return;
  const snap = JSON.stringify(cache, null, 2);
  writeQueue = writeQueue.then(async () => {
    await ensureDir();
    await fs.writeFile(STATS_FILE, snap, "utf8");
  });
  await writeQueue;
}

export async function getUser(userId: string, username: string): Promise<UserStats> {
  const store = await load();
  let u = store.users[userId];
  if (!u) {
    u = {
      userId,
      username,
      rating: 1000,
      wins: 0,
      losses: 0,
      gamesPlayed: 0,
      lastSeen: Date.now(),
    };
    store.users[userId] = u;
  }
  u.username = username;
  u.lastSeen = Date.now();
  return u;
}

export async function updateRating(
  userId: string,
  username: string,
  delta: number,
  won: boolean,
): Promise<UserStats> {
  const u = await getUser(userId, username);
  u.rating = Math.max(0, u.rating + delta);
  u.gamesPlayed += 1;
  if (won) u.wins += 1;
  else u.losses += 1;
  await persist();
  return u;
}

export async function topUsers(n = 10): Promise<UserStats[]> {
  const store = await load();
  return Object.values(store.users)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, n);
}

export async function rememberGreeting(channelId: string, line: string) {
  const store = await load();
  const arr = store.greetings[channelId] ?? [];
  arr.push(line);
  if (arr.length > 30) arr.shift();
  store.greetings[channelId] = arr;
  await persist();
}

export async function recentGreetings(channelId: string): Promise<string[]> {
  const store = await load();
  return store.greetings[channelId] ?? [];
}
