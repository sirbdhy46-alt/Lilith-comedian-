import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type Message,
} from "discord.js";
import { generateText } from "../lib/anthropic.js";
import { pick } from "../lib/util.js";
import { updateRating, topUsers, getUser } from "../lib/store.js";
import type { Command } from "../lib/registry.js";

const RIDDLES: Array<{ q: string; a: string }> = [
  { q: "Aisi cheez jo gili honi se phulti hai par paani mein dub jaati hai?", a: "sponge" },
  { q: "Bina pair chal sakta hai, bina muh khaa sakta hai — kya hai?", a: "ghadi" },
  { q: "Roz aata hai roz jaata hai par hath mein nahi aata, kya hai?", a: "samay" },
];

async function awardWin(message: Message) {
  const u = await updateRating(message.author.id, message.author.username, 15, true);
  return u;
}
async function awardLoss(message: Message) {
  const u = await updateRating(message.author.id, message.author.username, -8, false);
  return u;
}

async function askButton(
  message: Message,
  prompt: string,
  options: string[],
  timeoutMs = 25000,
): Promise<{ index: number; userId: string } | null> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    options.slice(0, 5).map((opt, i) =>
      new ButtonBuilder()
        .setCustomId(`opt_${i}`)
        .setLabel(opt.slice(0, 80))
        .setStyle(ButtonStyle.Primary),
    ),
  );
  const m = await message.reply({ content: prompt, components: [row] });
  try {
    const inter = await m.awaitMessageComponent({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === message.author.id,
      time: timeoutMs,
    });
    await inter.deferUpdate().catch(() => {});
    const index = parseInt(inter.customId.replace("opt_", ""), 10);
    await m.edit({ components: [] }).catch(() => {});
    return { index, userId: inter.user.id };
  } catch {
    await m.edit({ components: [] }).catch(() => {});
    return null;
  }
}

export const gameCommands: Command[] = [
  {
    name: "trivia",
    description: "Hinglish trivia (multiple choice)",
    category: "Games",
    cooldownMs: 4000,
    run: async ({ message, args }) => {
      const cat = args.join(" ") || pick(["Bollywood", "Cricket", "General Knowledge", "Tech", "Mythology"]);
      const raw = await generateText({
        userPrompt: `Generate ONE multiple-choice trivia question in Hinglish about "${cat}". Reply ONLY in this exact JSON: {"q":"...","options":["A","B","C","D"],"answer":0,"explain":"short hinglish line"} where answer is the index (0-3). Question max 20 words. Options max 6 words each. No code fences.`,
        maxTokens: 350,
      }).catch(() => "");
      let parsed: { q: string; options: string[]; answer: number; explain: string } | null = null;
      try {
        const cleaned = raw.replace(/```json|```/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = null;
      }
      if (!parsed || !Array.isArray(parsed.options) || parsed.options.length < 2) {
        await message.reply("Trivia engine ne tantrum maara. Phir try kar 🥲");
        return;
      }
      const ans = await askButton(message, `🎯 **${cat}**\n${parsed.q}`, parsed.options);
      if (!ans) {
        await (message.channel as any).send(`⏰ Time out. Sahi jawab: **${parsed.options[parsed.answer] ?? "?"}**`);
        await awardLoss(message);
        return;
      }
      const correct = ans.index === parsed.answer;
      if (correct) {
        const u = await awardWin(message);
        await (message.channel as any).send(`✅ Sahi jawab! +15 rating → **${u.rating}**\n${parsed.explain ?? ""}`);
      } else {
        const u = await awardLoss(message);
        await (message.channel as any).send(`❌ Galat. Sahi tha: **${parsed.options[parsed.answer]}**\nRating: **${u.rating}**\n${parsed.explain ?? ""}`);
      }
    },
  },
  {
    name: "wouldyourather",
    description: "Desi-themed Would You Rather",
    category: "Games",
    aliases: ["wyr"],
    cooldownMs: 3000,
    run: async ({ message }) => {
      const raw = await generateText({
        userPrompt: `Generate ONE Hinglish 'Would You Rather' with two desi-flavored absurd options. Reply ONLY JSON: {"a":"...","b":"..."} max 18 words each. No code fences.`,
        maxTokens: 200,
      }).catch(() => "");
      let p: { a: string; b: string } | null = null;
      try { p = JSON.parse(raw.replace(/```json|```/g, "").trim()); } catch { p = null; }
      if (!p) {
        p = { a: "Roz Maggi khaani padhe poori zindagi", b: "Kabhi WiFi nahi mile" };
      }
      const ans = await askButton(message, `🤔 **Would You Rather…**`, [p.a, p.b]);
      if (!ans) { await (message.channel as any).send("⏰ Decision-paralysis champ."); return; }
      await (message.channel as any).send(`Tune chuna: **${ans.index === 0 ? p.a : p.b}** — interesting flex 😏`);
    },
  },
  {
    name: "truth",
    description: "+truth [@user] — generate a truth question",
    category: "Games",
    cooldownMs: 1500,
    run: async ({ message, args }) => {
      const t = args[0] ?? message.author.toString();
      const q = await generateText({
        userPrompt: `Write ONE PG-13 'Truth' question in Hinglish for ${t}. Spicy but server-safe. Max 25 words. One emoji.`,
        maxTokens: 120,
      }).catch(() => "");
      await message.reply(`🫣 **Truth for ${t}**\n${q || "Last message kisko bheja tha jo abhi tak reply nahi aaya?"}`);
    },
  },
  {
    name: "dare",
    description: "+dare [@user] — generate a dare",
    category: "Games",
    cooldownMs: 1500,
    run: async ({ message, args }) => {
      const t = args[0] ?? message.author.toString();
      const q = await generateText({
        userPrompt: `Write ONE PG-13 'Dare' in Hinglish for ${t}. Server-safe, do-able in chat or VC. Max 25 words. One emoji.`,
        maxTokens: 120,
      }).catch(() => "");
      await message.reply(`🔥 **Dare for ${t}**\n${q || "Apne phone mein 5th contact ko 'mai tujhe miss kar raha hu' bhej."}`);
    },
  },
  {
    name: "riddle",
    description: "Hinglish riddle",
    category: "Games",
    cooldownMs: 2000,
    run: async ({ message }) => {
      const r = pick(RIDDLES);
      await message.reply(`🧩 **Riddle:** ${r.q}\n||Jawab: **${r.a}**||`);
    },
  },
  {
    name: "rhyme",
    description: "+rhyme <word> — Hinglish rap",
    category: "Games",
    cooldownMs: 2000,
    run: async ({ message, args }) => {
      const w = args.join(" ") || "chai";
      const t = await generateText({
        userPrompt: `Write a 4-line Hinglish rap that rhymes with the word "${w}". Punchy. Max 60 words.`,
        maxTokens: 200,
      }).catch(() => "");
      await message.reply(`🎤 **Bars on '${w}'**\n${t || "Bhai mic kharab hai aaj 🎤💀"}`);
    },
  },
  {
    name: "rps",
    description: "Rock Paper Scissors",
    category: "Games",
    cooldownMs: 2000,
    run: async ({ message }) => {
      const ans = await askButton(message, "✊🖐️✌️ Choose:", ["Rock", "Paper", "Scissors"]);
      if (!ans) { await (message.channel as any).send("⏰ Daro mat, button hi to dabana tha."); return; }
      const choices = ["Rock", "Paper", "Scissors"];
      const bot = Math.floor(Math.random() * 3);
      const me = ans.index;
      let result = "Tie 🤝";
      let won = false;
      if (me !== bot) {
        const userWins = (me === 0 && bot === 2) || (me === 1 && bot === 0) || (me === 2 && bot === 1);
        result = userWins ? "Tu jeeta 🏆" : "Lilith jeeti 😈";
        won = userWins;
      }
      const u = won
        ? await updateRating(message.author.id, message.author.username, 8, true)
        : me === bot
        ? await getUser(message.author.id, message.author.username)
        : await updateRating(message.author.id, message.author.username, -5, false);
      await (message.channel as any).send(`Tu: **${choices[me]}** vs Lilith: **${choices[bot]}** → ${result}\nRating: **${u.rating}**`);
    },
  },
  {
    name: "numbergame",
    description: "Higher / Lower (1-100)",
    category: "Games",
    cooldownMs: 2000,
    run: async ({ message }) => {
      const target = Math.floor(Math.random() * 100) + 1;
      let attempts = 0;
      let low = 1, high = 100;
      await message.reply(`🔢 Maine 1-100 ke beech ek number socha. Guess kar (chat me number bhej).`);
      const collector = (message.channel as any).createMessageCollector({
        filter: (m: Message) => m.author.id === message.author.id && /^\d+$/.test(m.content.trim()),
        time: 60000,
        max: 7,
      });
      collector.on("collect", async (m: Message) => {
        attempts++;
        const g = parseInt(m.content.trim(), 10);
        if (g === target) {
          collector.stop("won");
          const u = await updateRating(message.author.id, message.author.username, 12, true);
          await (message.channel as any).send(`🎯 ${attempts} attempt mein laga liya! +12 → **${u.rating}**`);
          return;
        }
        if (g < target) { low = Math.max(low, g + 1); await m.reply(`Higher (range: ${low}–${high})`); }
        else { high = Math.min(high, g - 1); await m.reply(`Lower (range: ${low}–${high})`); }
      });
      collector.on("end", async (_c: unknown, reason: string) => {
        if (reason !== "won") {
          const u = await updateRating(message.author.id, message.author.username, -5, false);
          await (message.channel as any).send(`💀 Number tha **${target}**. Rating: **${u.rating}**`);
        }
      });
    },
  },
  {
    name: "leaderboard",
    description: "Top 10 chaos lords",
    category: "Rating",
    aliases: ["lb", "top"],
    cooldownMs: 1500,
    run: async ({ message }) => {
      const top = await topUsers(10);
      if (top.length === 0) { await message.reply("Empty board. Game khelo bhai."); return; }
      const titles = ["👑 Server ka Badshah", "🥈 Almost Famous", "🥉 Participation Trophy Wala"];
      const lines = top.map((u, i) => {
        const title = titles[i] ?? (i === top.length - 1 && top.length >= 5 ? "💀 Bhai ghar ja" : `#${i + 1}`);
        return `${title} — **${u.username}** • ${u.rating} (${u.wins}W/${u.losses}L)`;
      });
      await message.reply(`🏆 **LEADERBOARD**\n${lines.join("\n")}`);
    },
  },
  {
    name: "mystats",
    description: "Your personal chaos stats",
    category: "Rating",
    aliases: ["stats", "rank"],
    cooldownMs: 1200,
    run: async ({ message }) => {
      const u = await getUser(message.author.id, message.author.username);
      const t = await generateText({
        userPrompt: `${u.username} has rating ${u.rating}, ${u.wins} wins, ${u.losses} losses. Roast-comment in ONE Hinglish line, max 20 words, one emoji.`,
        maxTokens: 80,
      }).catch(() => "");
      await message.reply(`📊 **${u.username}**\nRating: **${u.rating}** • W/L: ${u.wins}/${u.losses} • Played: ${u.gamesPlayed}\n${t || "Numbers tere brand ke saath insaaf nahi karte 💀"}`);
    },
  },
];
