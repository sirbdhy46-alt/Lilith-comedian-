import { EmbedBuilder } from "discord.js";
import { generateText } from "../lib/anthropic.js";
import { allCommands } from "../lib/registry.js";
import { fmtMs } from "../lib/util.js";
import type { Command } from "../lib/registry.js";

const LILITH_COLOR = 0x9b30ff;

const startedAt = Date.now();

export const utilCommands: Command[] = [
  {
    name: "ping",
    description: "Check if Lilith is alive",
    category: "Utility",
    cooldownMs: 1000,
    run: async ({ message }) => {
      const sent = await message.reply("Pinging…");
      const latency = sent.createdTimestamp - message.createdTimestamp;
      const ws = Math.round(message.client.ws.ping);
      await sent.edit(`✧ pong ✧\nlatency: **${latency}ms**\nws: **${ws}ms** ⟡`);
    },
  },
  {
    name: "uptime",
    description: "Bot uptime",
    category: "Utility",
    cooldownMs: 1000,
    run: async ({ message }) => {
      await message.reply(`⌬ alive since **${fmtMs(Date.now() - startedAt)}**\naur kitna jeena hai mujhe... 💀`);
    },
  },
  {
    name: "serverinfo",
    description: "Info about this server",
    category: "Utility",
    cooldownMs: 1500,
    run: async ({ message }) => {
      const g = message.guild;
      if (!g) { await message.reply("yeh DM hai bhai...\nserver kahan hai 😅"); return; }
      const embed = new EmbedBuilder()
        .setColor(LILITH_COLOR)
        .setTitle(`𓆩 ${g.name} 𓆪`)
        .addFields(
          { name: "❖ members", value: `${g.memberCount}`, inline: true },
          { name: "⟡ channels", value: `${g.channels.cache.size}`, inline: true },
          { name: "✧ born", value: `<t:${Math.floor(g.createdTimestamp / 1000)}:R>`, inline: true },
        )
        .setFooter({ text: "Lilith is watching..." });
      if (g.iconURL()) embed.setThumbnail(g.iconURL()!);
      await message.reply({ embeds: [embed] });
    },
  },
  {
    name: "help",
    description: "List of commands",
    category: "Utility",
    aliases: ["commands", "cmds"],
    cooldownMs: 1500,
    run: async ({ message }) => {
      const cmds = allCommands();
      const byCat = new Map<string, string[]>();
      for (const c of cmds) {
        const arr = byCat.get(c.category) ?? [];
        arr.push(`\`+${c.name}\``);
        byCat.set(c.category, arr);
      }
      const embed = new EmbedBuilder()
        .setColor(LILITH_COLOR)
        .setTitle("𓆩 ✧ LILITH ✧ 𓆪")
        .setDescription(
          "*chaotic, aesthetic, alive...*\n" +
          "prefix: `+`  •  fallback: `+crazy <anything>`\n" +
          "auto-react on: `hello` `hi` `gm` `gg` `icetea` `brb` `lilith`",
        );
      for (const [cat, list] of byCat.entries()) {
        embed.addFields({ name: `❖ ${cat}`, value: list.sort().join(" · ") });
      }
      embed.setFooter({ text: "🎤 +join · +say · +vcstory · +leave" });
      await message.reply({ embeds: [embed] });
    },
  },
  {
    name: "crazy",
    description: "+crazy <anything> — Lilith improvises",
    category: "Chaos Mode",
    aliases: ["c"],
    cooldownMs: 2500,
    run: async ({ message, args }) => {
      const q = args.join(" ").trim();
      if (!q) { await message.reply("Kuch likh bhai: `+crazy explain quantum physics like a drunk uncle`"); return; }
      const t = await generateText({
        userPrompt: q + "\n\nReply in Hinglish, max 80 words, with one emoji, full LilithAI energy.",
        maxTokens: 350,
      }).catch(() => "");
      await message.reply(t || "Brain freeze ho gaya. Phir try kar 🧊");
    },
  },
  {
    name: "overload",
    description: "Spam-react to recent messages",
    category: "Chaos Mode",
    cooldownMs: 15000,
    run: async ({ message }) => {
      const channel = message.channel;
      if (!("messages" in channel)) return;
      const fetched = await (channel as any).messages.fetch({ limit: 5 }).catch(() => null);
      if (!fetched) return;
      const emojis = ["💀", "😭", "🔥", "✨", "🤡", "🌪️", "🍿", "👀", "🥲", "💅"];
      for (const [, m] of fetched) {
        const e = emojis[Math.floor(Math.random() * emojis.length)] ?? "💀";
        await m.react(e).catch(() => {});
      }
      await message.reply("🌪️ Overload complete. Recover karo apni izzat.");
    },
  },
  {
    name: "glitch",
    description: "Lilith glitches dramatically",
    category: "Chaos Mode",
    cooldownMs: 4000,
    run: async ({ message }) => {
      await message.reply("`L̷̢̘̾i̶̧͍̾l̵̗̔i̴͍͝t̷̗̆h̷̢̛.̷̛̳ ̴̟̌E̵̲̎X̵͖̕E̶̢̕ ̵̱̔h̶̦͝a̷͙̔s̶̲̄ ̶̜̄c̵̟͘r̶͔̆a̵̛̟s̴̹̏h̴̭̉e̵̮̕d̷̬̾`");
      setTimeout(() => {
        (message.channel as any).send("…aur main wapas aa gayi 😈 try harder bhai").catch(() => {});
      }, 1500);
    },
  },
];
