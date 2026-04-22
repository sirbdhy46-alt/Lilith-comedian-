import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  StringSelectMenuBuilder,
  type Message,
} from "discord.js";
import { generateText, LILITH_PERSONA } from "../lib/anthropic.js";
import { normalizeIcetea } from "../lib/util.js";
import type { Command } from "../lib/registry.js";

const GENRES: Array<{ id: string; label: string; emoji: string; vibe: string }> = [
  { id: "horror", label: "Desi Horror", emoji: "🔪", vibe: "Indian small-town horror, raat, gaon, ek purana ghar; mix scares with dark comedy" },
  { id: "comedy", label: "Pure Comedy", emoji: "😂", vibe: "absurd Hinglish chaos comedy, very desi references (Maggi, mummy, autowala)" },
  { id: "darkhumor", label: "Dark Humor", emoji: "💀", vibe: "edgy dark humor but not cruel, no slurs, no real-world tragedies; PG-13" },
  { id: "paranormal", label: "Paranormal", emoji: "👻", vibe: "creepy ghost/folk legend story with eerie pacing" },
  { id: "gamer", label: "Gamer Stories", emoji: "🎮", vibe: "the game becomes real, glitches turn dangerous, lobby chaos" },
  { id: "romantic", label: "Desi Romantic", emoji: "💕", vibe: "cringe-but-sweet Bollywood romance with funny narrator commentary" },
  { id: "scifi", label: "Multiverse / Sci-Fi", emoji: "🌀", vibe: "hinglish sci-fi madness, time loops, multiverse desi versions" },
  { id: "fantasy", label: "Fantasy", emoji: "🧙", vibe: "desi mythology remix — devtas, rakshas, modern setting twist" },
  { id: "crime", label: "Crime Thriller", emoji: "🕵️", vibe: "indian crime thriller vibes, twisty, CID-meets-noir" },
  { id: "slice", label: "Slice of Life", emoji: "🤣", vibe: "relatable desi everyday chaos — autorickshaw, hostel, mummy calls" },
];

type Length = "short" | "medium" | "long";
const PARTS: Record<Length, number> = { short: 2, medium: 4, long: 6 };

interface StoryState {
  genre: string;
  vibe: string;
  hero: string;
  parts: string[];
  totalParts: number;
}

const sessions = new Map<string, StoryState>();

function genrePrompt(state: StoryState, partIdx: number): string {
  const isLast = partIdx + 1 >= state.totalParts;
  return `Tum LilithAI ho. Genre: "${state.vibe}".
Story ka main character "${state.hero}" hai.
Yeh story ka **Part ${partIdx + 1} of ${state.totalParts}** hai.
${state.parts.length ? `Pichla part:\n${state.parts.join("\n---\n")}\n` : ""}
Niyam:
- Hinglish (Devanagari nahi, Roman script).
- 80-130 words. Strong imagery, suspense ya humor genre ke hisaab se.
- 3-5 short paragraphs. Cinematic, naturally flowing.
- "icetea" ko hamesha "Ice Tea" likho.
- Koi NSFW, slur, ya real-world tragedy nahi.
${isLast ? "- YEH FINAL PART HAI. Crisp climax + ek punchline ya twist ending de." : "- Cliffhanger ya choice point pe end karo, taaki next part juicy ho."}
Bas story bhejo, koi heading ya 'Part X:' label mat lagao.`;
}

async function generatePart(state: StoryState, idx: number): Promise<string> {
  const text = await generateText({
    system: LILITH_PERSONA + " Tum ek mast Hinglish kahaani sunane wali ho.",
    userPrompt: genrePrompt(state, idx),
    maxTokens: 700,
    model: "claude-sonnet-4-6",
  });
  return normalizeIcetea(text || "Kahaani thodi atak gayi yaar… phir try karo.");
}

async function runStorySession(message: Message, state: StoryState) {
  const userId = message.author.id;
  sessions.set(userId, state);
  for (let i = 0; i < state.totalParts; i++) {
    const segment = await generatePart(state, i);
    state.parts.push(segment);
    const isLast = i + 1 >= state.totalParts;
    const header = `📖 **${state.genre}** — Part ${i + 1}/${state.totalParts} • Hero: ${state.hero}`;

    if (isLast) {
      await (message.channel as any).send(`${header}\n\n${segment}\n\n*— THE END —*`);
      sessions.delete(userId);
      return;
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("story_next").setLabel("Aage badho ➡️").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("story_stop").setLabel("Bas, bandh karo 🛑").setStyle(ButtonStyle.Secondary),
    );
    const m = await (message.channel as any).send({ content: `${header}\n\n${segment}`, components: [row] });
    try {
      const inter = await m.awaitMessageComponent({
        componentType: ComponentType.Button,
        filter: (i: { user: { id: string } }) => i.user.id === userId,
        time: 90000,
      });
      await inter.deferUpdate().catch(() => {});
      await m.edit({ components: [] }).catch(() => {});
      if (inter.customId === "story_stop") {
        await (message.channel as any).send("Theek hai, kahaani yahin band. Lilith bhi thaki hu thodi 😴");
        sessions.delete(userId);
        return;
      }
    } catch {
      await m.edit({ components: [] }).catch(() => {});
      await (message.channel as any).send("⏰ Tu so gaya kya? Kahaani yahin pause kar deti hu.");
      sessions.delete(userId);
      return;
    }
  }
}

async function pickGenreAndRun(message: Message, hero: string, length: Length, forcedGenreId?: string) {
  let chosen = forcedGenreId
    ? GENRES.find((g) => g.id === forcedGenreId) ?? null
    : null;

  if (!chosen) {
    const select = new StringSelectMenuBuilder()
      .setCustomId("story_genre")
      .setPlaceholder("Genre chuno…")
      .addOptions(
        GENRES.map((g) => ({ label: `${g.emoji} ${g.label}`, value: g.id, description: g.vibe.slice(0, 90) })),
      );
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
    const m = await message.reply({
      content: `📚 **Story time!** Hero: ${hero} • Length: ${length}\nGenre select karo:`,
      components: [row],
    });
    try {
      const inter = await m.awaitMessageComponent({
        componentType: ComponentType.StringSelect,
        filter: (i) => i.user.id === message.author.id,
        time: 45000,
      });
      await inter.deferUpdate().catch(() => {});
      await m.edit({ components: [] }).catch(() => {});
      chosen = GENRES.find((g) => g.id === inter.values[0]) ?? null;
    } catch {
      await m.edit({ components: [] }).catch(() => {});
      await (message.channel as any).send("⏰ Genre select nahi kiya. Skip 🙄");
      return;
    }
  }

  if (!chosen) return;
  const state: StoryState = {
    genre: `${chosen.emoji} ${chosen.label}`,
    vibe: chosen.vibe,
    hero,
    parts: [],
    totalParts: PARTS[length],
  };
  await runStorySession(message, state);
}

export const storyCommands: Command[] = [
  {
    name: "story",
    description: "+story [short|medium|long] — interactive Hinglish story",
    category: "Story",
    cooldownMs: 8000,
    run: async ({ message, args }) => {
      if (sessions.has(message.author.id)) {
        await message.reply("Ek story already chal rahi hai bhai. Pehle finish kar 📖");
        return;
      }
      const lenArg = args.find((a) => ["short", "medium", "long"].includes(a.toLowerCase()));
      const length = (lenArg?.toLowerCase() as Length | undefined) ?? "medium";
      const heroArg = args.find((a) => /^<@!?\d+>$/.test(a));
      const hero = heroArg ?? message.author.toString();
      await pickGenreAndRun(message, hero, length);
    },
  },
  {
    name: "storycustom",
    description: "+storycustom @user — that user is the hero",
    category: "Story",
    aliases: ["storyhero"],
    cooldownMs: 8000,
    run: async ({ message, args }) => {
      const m = args.find((a) => /^<@!?\d+>$/.test(a));
      if (!m) { await message.reply("Tag karo bhai: `+storycustom @user`"); return; }
      await pickGenreAndRun(message, m, "medium");
    },
  },
  {
    name: "storyrandom",
    description: "Random genre, surprise story",
    category: "Story",
    cooldownMs: 8000,
    run: async ({ message }) => {
      if (sessions.has(message.author.id)) {
        await message.reply("Ek story already chal rahi hai 📖");
        return;
      }
      const g = GENRES[Math.floor(Math.random() * GENRES.length)]!;
      await pickGenreAndRun(message, message.author.toString(), "medium", g.id);
    },
  },
  {
    name: "storylength",
    description: "+storylength <short|medium|long> — info only",
    category: "Story",
    cooldownMs: 1500,
    run: async ({ message, args }) => {
      const len = args[0]?.toLowerCase();
      if (!len || !["short", "medium", "long"].includes(len)) {
        await message.reply("Usage: `+story short` ya `+story long`. Default: medium.");
        return;
      }
      await message.reply(`Cool — agli baar likh: \`+story ${len}\``);
    },
  },
];
