import type { Message } from "discord.js";
import { generateText, LILITH_PERSONA } from "./anthropic.js";
import { rememberGreeting, recentGreetings } from "./store.js";
import { randomGif } from "./giphy.js";
import { pick, clampLength, normalizeIcetea } from "./util.js";

const greetingRegex = /\b(hello+|hii+|hey+|hola|namaste|namaskar)\b/i;
const gmRegex = /\bgm\b/i;
const ggRegex = /\bgg\b/i;
const iceteaRegex = /\b(ice\s*tea|icetea)\b/i;
const brbRegex = /\bbrb\b/i;
const lilithRegex = /\blilith\b/i;
const goodBotRegex = /\bgood\s*bot\b/i;
const badBotRegex = /\bbad\s*bot\b/i;

const cooldownByUserChannel = new Map<string, number>();
const COOLDOWN_MS = 8000;

const FALLBACK_GREETINGS = [
  "𓆩 Lilith is watching... 👀 𓆪\n*tu finally aaya...*\nserver ki vibe ab on hai ✧",
  "❖ entry detected ❖\narre dekho dekho...\nkaun aaya scene mein 💀",
  "✧ hello hello ✧\nchai bana, drama suru karein?\n☕",
  "⟡ namaste beta ⟡\nmood hai ya nahi aaj?\n*Lilith ko pata chal jaayega...*",
  "𓆩 oye hoye 𓆪\nserver ka hero...\nya server ka villain? 😈",
];

const FALLBACK_GG = [
  "✧ GG ✧\nmatch khatam...\nab biryani aane do 🍛",
  "❖ kya commentary thi ❖\nStar Sports vibes,\nticket bhej do mujhe 🏏",
  "⟡ GG GG ⟡\ntrophy nahi mili?\ncoupon hi le le bhai 🏆",
];

const FALLBACK_GM_LATE = [
  "☀️ subah?\nbhai sab lunch kar rahe hain...\ntu kis time zone mein hai 💀",
  "❖ good morning ❖\n*at this time?*\ntera GM = humara GN 😴",
];

const FALLBACK_GM_HYPE = [
  "✧ GUD MORNING ✧\nsun bhi sharma gaya...\ntujhe dekh ke ☀️",
  "𓆩 subah ho gayi mamu 𓆪\naaj ka din...\nteri gaali pe likha hai 🌞",
];

const FALLBACK_BRB = [
  "⟡ ja bhai ⟡\nhum yahan...\nrote rahenge 🥺",
  "❖ brb? ❖\nlautna mat...\nphir kabhi 💀",
  "✧ nikal ✧\npehli fursat mein 🙃",
];

function shouldRespond(userId: string, channelId: string): boolean {
  const k = `${userId}:${channelId}`;
  const last = cooldownByUserChannel.get(k) ?? 0;
  if (Date.now() - last < COOLDOWN_MS) return false;
  cooldownByUserChannel.set(k, Date.now());
  return true;
}

async function smartGreeting(message: Message): Promise<string> {
  const recent = await recentGreetings(message.channelId);
  try {
    const prompt = `Someone just greeted the channel. Write ONE short, punchy Hinglish greeting roast/welcome line (max 18 words). Use exactly one emoji. Make it different from these recent ones:\n${recent.slice(-10).join("\n") || "(none)"}\n\nReply with ONLY the line, nothing else.`;
    const line = await generateText({
      userPrompt: prompt,
      maxTokens: 80,
      system: LILITH_PERSONA,
    });
    if (line) {
      await rememberGreeting(message.channelId, line);
      return clampLength(line, 200);
    }
  } catch (e) {
    console.warn("[autoreact] greeting llm failed", e);
  }
  return pick(FALLBACK_GREETINGS);
}

export async function handleAutoReactions(message: Message): Promise<boolean> {
  if (message.author.bot) return false;
  if (!shouldRespond(message.author.id, message.channelId)) return false;

  const content = message.content;

  if (lilithRegex.test(content)) {
    const url = await randomGif("lilith diablo");
    if (url) {
      await (message.channel as any).send({ content: "𓆩 mera naam mat lo itna 𓆪\nobsessed ho kya... 😏", files: [url] }).catch(() => {});
    } else {
      await message.reply("𓆩 mera naam mat lo itna 𓆪\nobsessed ho kya... 😏").catch(() => {});
    }
    return true;
  }

  if (goodBotRegex.test(content)) {
    await message.reply("✧ finally ✧\nkoi to brain wala mila...\n🍪").catch(() => {});
    return true;
  }

  if (badBotRegex.test(content)) {
    await message.reply("❖ tera face bad bot hai ❖\nmirror dekh bhai...\n💀").catch(() => {});
    return true;
  }

  if (iceteaRegex.test(content)) {
    const fixed = normalizeIcetea(content);
    await message.reply(`⟡ Ice Tea ⟡\nwah angrezi ke 14...\nchai pila bhai ☕\n*"${clampLength(fixed, 120)}"*`).catch(() => {});
    return true;
  }

  if (brbRegex.test(content)) {
    await message.reply(pick(FALLBACK_BRB)).catch(() => {});
    return true;
  }

  if (ggRegex.test(content)) {
    await message.reply(pick(FALLBACK_GG)).catch(() => {});
    return true;
  }

  if (gmRegex.test(content)) {
    const hour = new Date().getHours();
    const line = hour >= 11 ? pick(FALLBACK_GM_LATE) : pick(FALLBACK_GM_HYPE);
    await message.reply(line).catch(() => {});
    return true;
  }

  if (greetingRegex.test(content)) {
    const line = await smartGreeting(message);
    await message.reply(line).catch(() => {});
    return true;
  }

  return false;
}
