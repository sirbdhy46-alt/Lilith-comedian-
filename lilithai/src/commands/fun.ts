import { generateText, LILITH_PERSONA } from "../lib/anthropic.js";
import { randomGif } from "../lib/giphy.js";
import { pick } from "../lib/util.js";
import type { Command } from "../lib/registry.js";

const JOKES = [
  "Bhai ne PUBG khelte huye proposal kiya — *'tu meri team mein aaja'*. Girl ne kaha *'main solo queue hu'*. 💔",
  "Doctor: Aapko stress hai. Indian patient: Bhaiya ek aur problem bata do, total 5 ho jaayein, EMI mein chuka dunga 💀",
  "WiFi ka password 'shaadi karoge?' rakha — mummy ne consent samajh liya, ab sagai pakki 😭",
  "Pizza walla bola '30 min nahi to free'. 31 min baad bola — *'sir aapka time zone galat hai'* ⏱️",
];

export const funCommands: Command[] = [
  {
    name: "joke",
    description: "Random Hinglish joke",
    category: "Fun",
    aliases: ["jk"],
    cooldownMs: 1500,
    run: async ({ message }) => {
      try {
        const t = await generateText({
          userPrompt: "Tell ONE original short Hinglish joke (max 35 words). One emoji. Punchy. Reply with just the joke.",
          maxTokens: 120,
        });
        await message.reply(t || pick(JOKES));
      } catch {
        await message.reply(pick(JOKES));
      }
    },
  },
  {
    name: "fact",
    description: "Useless fact, Hinglish style",
    category: "Fun",
    cooldownMs: 1500,
    run: async ({ message }) => {
      const t = await generateText({
        userPrompt: "Give ONE absurd useless 'fact' in Hinglish (max 30 words). One emoji.",
        maxTokens: 120,
      }).catch(() => "");
      await message.reply(t || "Fact: Maggi 2 minutes mein nahi banti, woh sirf marketing hai 🍜");
    },
  },
  {
    name: "vibe",
    description: "Drop a vibe check",
    category: "Fun",
    cooldownMs: 1500,
    run: async ({ message }) => {
      const t = await generateText({
        userPrompt: "Do a one-line Hinglish 'vibe check' for whoever just summoned you. Roast-loving, max 25 words, one emoji.",
        maxTokens: 100,
      }).catch(() => "");
      await message.reply(t || "Vibe: 7/10 — chai missing, drama maxed out ☕");
    },
  },
  {
    name: "chaos",
    description: "Random chaotic Lilith outburst",
    category: "Fun",
    cooldownMs: 2000,
    run: async ({ message }) => {
      const t = await generateText({
        userPrompt: "You are unleashed. Write ONE chaotic absurd Hinglish line (max 30 words). One emoji. Pure chaos energy.",
        maxTokens: 120,
        system: LILITH_PERSONA + " Be MORE unhinged than usual.",
      }).catch(() => "");
      await message.reply(t || "AAAAAA chai ke bina ek aur Monday survive nahi hota 🌪️");
    },
  },
  {
    name: "lilith",
    description: "Summon a Lilith GIF",
    category: "Lilith",
    cooldownMs: 2000,
    run: async ({ message }) => {
      const url = await randomGif("lilith diablo");
      if (url) await (message.channel as any).send({ content: "👑 Lilith has entered the chat", files: [url] });
      else await message.reply("GIPHY soya hua hai. Phir bhi: Lilith reigns 👑");
    },
  },
  {
    name: "lilithrage",
    description: "Lilith goes nuclear",
    category: "Lilith",
    cooldownMs: 2000,
    run: async ({ message }) => {
      const url = await randomGif("angry rage demon");
      if (url) await (message.channel as any).send({ content: "🔥 Mat chhed, Lilith bhadak gayi 🔥", files: [url] });
      else await message.reply("🔥 Mat chhed, Lilith bhadak gayi 🔥");
    },
  },
  {
    name: "lilithvibe",
    description: "Random Lilith mood GIF",
    category: "Lilith",
    cooldownMs: 2000,
    run: async ({ message }) => {
      const moods = ["lilith", "dark queen", "demon goddess", "evil smile", "vampire"];
      const url = await randomGif(pick(moods));
      if (url) await (message.channel as any).send({ content: "✨ Lilith ka aaj ka mood:", files: [url] });
      else await message.reply("Mood: chaotic. GIF: missing. Vibe: intact ✨");
    },
  },
  {
    name: "lilithquote",
    description: "A dramatic Lilith quote",
    category: "Lilith",
    cooldownMs: 1500,
    run: async ({ message }) => {
      const t = await generateText({
        userPrompt: "Write ONE dramatic queen-of-darkness Lilith quote, half English half Hindi, max 25 words, one emoji.",
        maxTokens: 100,
      }).catch(() => "");
      await message.reply(`> ${t || "Main aag hu. Tum sirf dhuan ho. 🔥"}\n— **Lilith**`);
    },
  },
  {
    name: "gif",
    description: "+gif <emotion> — fetch a GIF",
    category: "GIF/Media",
    cooldownMs: 1200,
    run: async ({ message, args }) => {
      const q = args.join(" ").trim() || "mood";
      const url = await randomGif(q);
      if (url) await (message.channel as any).send({ content: `🎬 \`${q}\``, files: [url] });
      else await message.reply(`Kuch nahi mila '${q}' ke liye, GIPHY thaka hai 🥲`);
    },
  },
  {
    name: "giphy",
    description: "+giphy <keyword>",
    category: "GIF/Media",
    aliases: ["gifsearch"],
    cooldownMs: 1200,
    run: async ({ message, args }) => {
      const q = args.join(" ").trim();
      if (!q) {
        await message.reply("Kuch likh bhi do bhai: `+giphy biryani`");
        return;
      }
      const url = await randomGif(q);
      if (url) await (message.channel as any).send({ content: `🎬 \`${q}\``, files: [url] });
      else await message.reply(`'${q}' pe GIPHY ne shoulder shrug kiya 🤷`);
    },
  },
  {
    name: "meme",
    description: "Random meme GIF",
    category: "GIF/Media",
    cooldownMs: 1200,
    run: async ({ message }) => {
      const url = await randomGif(pick(["meme", "indian meme", "funny", "lol"]));
      if (url) await (message.channel as any).send({ files: [url] });
      else await message.reply("Meme stash empty, mood ruined 😩");
    },
  },
  {
    name: "fortune",
    description: "Hinglish fortune cookie",
    category: "Fun",
    cooldownMs: 1500,
    run: async ({ message }) => {
      const t = await generateText({
        userPrompt: "Write ONE absurd Hinglish 'fortune cookie' prediction for today (max 20 words). One emoji.",
        maxTokens: 80,
      }).catch(() => "");
      await message.reply(`🔮 ${t || "Aaj aapki chai thandi hogi, par dil garam rahega."}`);
    },
  },
  {
    name: "horoscope",
    description: "+horoscope <sign> — totally accurate (lie)",
    category: "Fun",
    cooldownMs: 1500,
    run: async ({ message, args }) => {
      const sign = args.join(" ") || "Generic Bhai-rashi";
      const t = await generateText({
        userPrompt: `Write a fake hilarious Hinglish horoscope for the sign "${sign}" for today. Max 50 words. One emoji. Mention something random and desi.`,
        maxTokens: 200,
      }).catch(() => "");
      await message.reply(`🔭 **${sign}**\n${t || "Aaj kuch bhi karoge, mummy daatengi. Survive kar lo."}`);
    },
  },
];
