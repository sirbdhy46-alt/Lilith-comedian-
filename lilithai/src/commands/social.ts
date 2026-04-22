import { generateText } from "../lib/anthropic.js";
import { pick } from "../lib/util.js";
import type { Command } from "../lib/registry.js";

function firstMention(args: string[]): string | null {
  const m = args.find((a) => /^<@!?\d+>$/.test(a));
  return m ?? null;
}

function nameFor(args: string[], fallback = "tu"): string {
  const m = firstMention(args);
  if (m) return m;
  const rest = args.join(" ").trim();
  return rest.length ? rest : fallback;
}

const PICKUP = [
  "Tu Maggi hai kya? 2 minute mein dil pak gaya 🍜",
  "Tu chai hai aur main biskut — saath mein dub jaayein? ☕",
  "WiFi password chahiye? Kyunki main tujhse connect hona chahta hu 📶",
  "Tu Geometry box hai kya, kyunki tujhme set squares bhi hai aur dil bhi 📐",
];

const SHIP_REASONS = [
  "Dono ka Spotify Wrapped same hai 🎧",
  "Ek 'thik hai' bolta hai, doosra accept karta hai 🥺",
  "Ek roast karta hai, doosra hasta hai — perfect dynamics 💀",
  "Same chai-sugar level. Marriage material ☕",
];

export const socialCommands: Command[] = [
  {
    name: "compliment",
    description: "+compliment @user — over-the-top dramatic compliment",
    category: "Social",
    cooldownMs: 1500,
    run: async ({ message, args }) => {
      const target = nameFor(args, message.author.toString());
      const t = await generateText({
        userPrompt: `Write ONE over-the-top dramatic Hinglish compliment for ${target}. Max 35 words. One emoji. Wholesome, theatrical, no roasting.`,
        maxTokens: 150,
      }).catch(() => "");
      await message.reply(t || `${target}, tu sunrise hai aur hum sab insomniacs ✨`);
    },
  },
  {
    name: "roast",
    description: "+roast @user — savage but funny",
    category: "Social",
    cooldownMs: 1500,
    run: async ({ message, args }) => {
      const target = nameFor(args, message.author.toString());
      const t = await generateText({
        userPrompt: `Write ONE savage but loving Hinglish roast for ${target}. Max 35 words. One emoji. NO slurs, NO body shaming, NO family insults, NO NSFW. Comedy roast only.`,
        maxTokens: 150,
      }).catch(() => "");
      await message.reply(t || `${target}, tu group project ka woh banda hai jiska naam slide pe likha hi nahi tha 💀`);
    },
  },
  {
    name: "ship",
    description: "+ship @a @b — dramatic shipping with score",
    category: "Social",
    cooldownMs: 1500,
    run: async ({ message, args }) => {
      const a = args[0] ?? message.author.toString();
      const b = args[1] ?? "Lilith";
      const score = Math.floor(Math.random() * 101);
      const reason = pick(SHIP_REASONS);
      const verdict =
        score < 25
          ? "Bhai padosi rehne do 🙃"
          : score < 60
          ? "Friendship goals, no more 🤝"
          : score < 85
          ? "Shaadi ka card chhapwa do 💌"
          : "MAIN HEROINE × MAIN HERO 💞";
      await (message.channel as any).send(
        `💘 **Ship-o-meter** ${a} ❤️ ${b}\nScore: **${score}/100**\nReason: ${reason}\nVerdict: ${verdict}`,
      );
    },
  },
  {
    name: "pickupline",
    description: "Cringe-max desi pickup line",
    category: "Social",
    aliases: ["pickup", "rizz"],
    cooldownMs: 1500,
    run: async ({ message }) => {
      const t = await generateText({
        userPrompt: "ONE cringey wholesome Hinglish desi pickup line. Max 25 words. One emoji.",
        maxTokens: 100,
      }).catch(() => "");
      await message.reply(t || pick(PICKUP));
    },
  },
  {
    name: "rate",
    description: "+rate @user [category] — vibe/rizz/chaos/braincells",
    category: "Rating",
    cooldownMs: 1200,
    run: async ({ message, args }) => {
      const target = firstMention(args) ?? message.author.toString();
      const cat = args.filter((a) => !/^<@!?\d+>$/.test(a)).join(" ") || pick(["vibe", "rizz", "chaos energy", "brain cell count"]);
      const score = Math.floor(Math.random() * 11);
      const t = await generateText({
        userPrompt: `Roast-rate ${target}'s "${cat}" at ${score}/10. ONE Hinglish line max 25 words. One emoji.`,
        maxTokens: 100,
      }).catch(() => "");
      await message.reply(`📊 ${target} • **${cat}**: ${score}/10\n${t || "Numbers jhooth nahi bolte."}`);
    },
  },
  {
    name: "roastbattle",
    description: "+roastbattle @user — bot judges",
    category: "Games",
    cooldownMs: 5000,
    run: async ({ message, args }) => {
      const a = message.author.toString();
      const b = args[0] ?? "Lilith";
      const t = await generateText({
        userPrompt: `Mini Hinglish roast battle: write 1 roast from ${a} aimed at ${b}, then 1 counter-roast from ${b} aimed at ${a}, then declare a winner with reason. Max 90 words total. PG-13. Format:\nRound 1 — ${a}: ...\nRound 2 — ${b}: ...\n🏆 Winner: ...`,
        maxTokens: 350,
      }).catch(() => "");
      await message.reply(t || `🏆 Tie. Dono ko chai pilao aur ghar bhejo.`);
    },
  },
];
