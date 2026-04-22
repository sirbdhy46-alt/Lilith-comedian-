import type { Command } from "../lib/registry.js";
import {
  joinUserVoice,
  leaveVoice,
  speak,
  speakLines,
  stopSpeaking,
  isInVoice,
  isElevenLabsConfigured,
  LILITH_VOICE_ID,
} from "../lib/voice.js";
import { generateText, LILITH_PERSONA } from "../lib/anthropic.js";
import { normalizeIcetea } from "../lib/util.js";
import { aestheticGif } from "../lib/giphy.js";
import type { GuildMember } from "discord.js";

function ensureMember(message: any): GuildMember | null {
  if (!message.guild) return null;
  return message.member as GuildMember | null;
}

export const voiceCommands: Command[] = [
  {
    name: "join",
    description: "+join — Lilith joins your voice channel",
    aliases: ["vcjoin"],
    category: "Voice",
    cooldownMs: 3000,
    run: async ({ message }) => {
      if (!isElevenLabsConfigured()) {
        await message.reply("Voice key missing yaar, owner ko bol ELEVENLABS_API_KEY add kare 🔑");
        return;
      }
      const member = ensureMember(message);
      if (!member) { await message.reply("Yeh command sirf server me chalegi."); return; }
      try {
        await joinUserVoice(member);
        const gif = await aestheticGif("entry").catch(() => null);
        const payload: any = {
          content: "𓆩 VC mein aa gayi 𓆪\n*ab kya scene hai?*\n`+say` ya `+vcstory` chala ✧",
        };
        if (gif) payload.files = [gif];
        await message.reply(payload);
        speak(member, "Lilith aa gayi... ab dekho chaos.").catch((e) =>
          console.warn("[voice] greet speak failed", e?.message),
        );
      } catch (e: any) {
        console.error("[voice] +join failed:", e);
        await message.reply(`💀 ${e?.message || "VC join nahi ho payi"}`);
      }
    },
  },
  {
    name: "leave",
    description: "+leave — Lilith leaves the voice channel",
    aliases: ["vcleave", "dc"],
    category: "Voice",
    cooldownMs: 2000,
    run: async ({ message }) => {
      if (!message.guild) { await message.reply("Server-only command."); return; }
      const ok = leaveVoice(message.guild.id);
      if (ok) {
        const gif = await aestheticGif("bye").catch(() => null);
        const payload: any = { content: "⟡ bye ⟡\nchai peene jaa rahi hu... 👋" };
        if (gif) payload.files = [gif];
        await message.reply(payload);
      } else {
        await message.reply("main toh kisi VC me hu hi nahi 🤷‍♀️");
      }
    },
  },
  {
    name: "say",
    description: "+say <text> — Lilith speaks it in VC",
    aliases: ["speak", "tts"],
    category: "Voice",
    cooldownMs: 2500,
    run: async ({ message, args }) => {
      if (!isElevenLabsConfigured()) {
        await message.reply("ELEVENLABS_API_KEY missing — voice off hai 🔑");
        return;
      }
      const member = ensureMember(message);
      if (!member) { await message.reply("Server-only."); return; }
      const text = normalizeIcetea(args.join(" ").trim());
      if (!text) { await message.reply("Kuch likh: `+say arre yaar chai pila`"); return; }
      if (text.length > 600) { await message.reply("Bohot lamba hai bhai, 600 chars max."); return; }
      try {
        await message.react("🎙️").catch(() => {});
        await speak(member, text);
        await message.react("✅").catch(() => {});
      } catch (e: any) {
        await message.reply(`💀 ${e?.message || "Bol nahi payi"}`);
      }
    },
  },
  {
    name: "vcstory",
    description: "+vcstory <prompt> — Lilith narrates a short story in VC",
    aliases: ["narrate"],
    category: "Voice",
    cooldownMs: 15000,
    run: async ({ message, args }) => {
      if (!isElevenLabsConfigured()) {
        await message.reply("ELEVENLABS_API_KEY missing 🔑");
        return;
      }
      const member = ensureMember(message);
      if (!member) { await message.reply("Server-only."); return; }
      const prompt = args.join(" ").trim() || "ek raat ka chhota sa horror";

      const gif = await aestheticGif("story").catch(() => null);
      const intro: any = {
        content: `𓆩 Lilith is watching... 👀 𓆪\n*narrating:* **${prompt}**\n⟡ headphones lagao ⟡`,
      };
      if (gif) intro.files = [gif];
      await message.reply(intro);

      const raw = await generateText({
        system:
          LILITH_PERSONA +
          " Tum voice narrator ho. Hinglish me chhoti, dramatic lines bolti ho.",
        userPrompt:
          `Topic: "${prompt}".\n` +
          `Ek 6-8 line ka mini story banao VC narration ke liye.\n` +
          `Niyam:\n` +
          `- Har line max 1 sentence, 12-18 words.\n` +
          `- Hinglish (Roman script).\n` +
          `- Cinematic pauses (ek line ek beat).\n` +
          `- "icetea" → "Ice Tea".\n` +
          `- NO emojis, NO numbering, NO markdown — sirf raw lines.\n` +
          `- Ek ek line nayi line par.`,
        maxTokens: 400,
      }).catch(() => "");

      const lines = normalizeIcetea(raw)
        .split(/\n+/)
        .map((l) => l.replace(/^[\d\-•*.\s]+/, "").trim())
        .filter((l) => l.length > 2 && l.length < 240)
        .slice(0, 8);

      if (!lines.length) {
        await message.reply("Story generate nahi hui, phir try kar.");
        return;
      }

      try {
        await speakLines(member, lines);
        await (message.channel as any).send(
          `📖 **Story khatam.**\n>>> ${lines.join("\n")}\n\n*Aage badhana hai? \`+vcstory <next prompt>\`*`,
        );
      } catch (e: any) {
        await message.reply(`💀 VC narration fail: ${e?.message || "unknown"}`);
      }
    },
  },
  {
    name: "stopvc",
    description: "+stopvc — stop current VC narration",
    aliases: ["shh", "chup"],
    category: "Voice",
    cooldownMs: 1500,
    run: async ({ message }) => {
      if (!message.guild) { await message.reply("Server-only."); return; }
      const ok = stopSpeaking(message.guild.id);
      await message.reply(ok ? "❖ chup ❖\n*silence...*  🤐" : "bol toh rahi hi nahi thi 🙄");
    },
  },
  {
    name: "vcstatus",
    description: "+vcstatus — voice status",
    category: "Voice",
    cooldownMs: 2000,
    run: async ({ message }) => {
      if (!message.guild) { await message.reply("Server-only."); return; }
      const inVC = isInVoice(message.guild.id);
      await message.reply(
        `🎤 VC: ${inVC ? "connected ✅" : "not connected ❌"}\n` +
          `🔑 ElevenLabs: ${isElevenLabsConfigured() ? "configured ✅" : "missing ❌"}\n` +
          `🗣️ Voice ID: \`${LILITH_VOICE_ID}\``,
      );
    },
  },
];
