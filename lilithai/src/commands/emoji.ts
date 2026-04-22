import { PermissionsBitField, EmbedBuilder, type Guild, type Message } from "discord.js";
import type { Command } from "../lib/registry.js";

const LILITH_COLOR = 0x9b30ff;

const BAD_KEYWORDS = [
  "nsfw", "porn", "sex", "boob", "tit", "dick", "cock", "pussy", "vagina",
  "anal", "cum", "fap", "nude", "naked", "hentai", "lewd", "hump", "ass",
  "fuck", "shit", "bitch", "slut", "whore", "rape", "kill", "nazi",
  "swastika", "hitler", "racist", "nigger", "nigga", "faggot", "retard",
  "kys", "suicide", "blood", "gore",
];

function isBadEmojiName(name: string): boolean {
  const lower = name.toLowerCase().replace(/[_\-0-9]/g, "");
  return BAD_KEYWORDS.some((kw) => lower.includes(kw));
}

function parseCustomEmojis(text: string): Array<{ animated: boolean; name: string; id: string }> {
  const out: Array<{ animated: boolean; name: string; id: string }> = [];
  const re = /<(a?):([a-zA-Z0-9_]{2,32}):(\d{15,25})>/g;
  let m: RegExpExecArray | null;
  const seen = new Set<string>();
  while ((m = re.exec(text)) !== null) {
    const id = m[3]!;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ animated: m[1] === "a", name: m[2]!, id });
  }
  return out;
}

function emojiCdnUrl(id: string, animated: boolean): string {
  return `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}?size=128&quality=lossless`;
}

interface CloneResult {
  added: string[];
  skipped: string[];
  failed: string[];
}

async function uploadEmojis(
  guild: Guild,
  emojis: Array<{ animated: boolean; name: string; id: string; url?: string }>,
  reason: string,
): Promise<CloneResult> {
  const result: CloneResult = { added: [], skipped: [], failed: [] };
  const existingNames = new Set(guild.emojis.cache.map((e) => e.name?.toLowerCase()));

  for (const e of emojis) {
    if (isBadEmojiName(e.name)) {
      result.skipped.push(`${e.name} (filtered)`);
      continue;
    }
    let safeName = e.name.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 32);
    if (safeName.length < 2) safeName = `emoji_${e.id.slice(-4)}`;
    if (existingNames.has(safeName.toLowerCase())) {
      result.skipped.push(`${safeName} (exists)`);
      continue;
    }
    const url = e.url ?? emojiCdnUrl(e.id, e.animated);
    try {
      const created = await guild.emojis.create({ attachment: url, name: safeName, reason });
      result.added.push(created.toString());
      existingNames.add(safeName.toLowerCase());
    } catch (err: any) {
      const msg = (err?.message || "").slice(0, 80);
      result.failed.push(`${safeName} (${msg})`);
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  return result;
}

function ensureManagerPerms(message: Message): string | null {
  if (!message.guild) return "yeh DM hai bhai, server mein chala 💀";
  const perms = message.member?.permissions as PermissionsBitField | undefined;
  if (!perms?.has(PermissionsBitField.Flags.ManageGuildExpressions)) {
    return "tujhe **Manage Expressions** perm chahiye is command ke liye ❖";
  }
  const me = message.guild.members.me;
  if (!me?.permissions.has(PermissionsBitField.Flags.ManageGuildExpressions)) {
    return "mereko bhi **Manage Expressions** perm de pehle 🙏";
  }
  return null;
}

function summaryEmbed(title: string, result: CloneResult): EmbedBuilder {
  const e = new EmbedBuilder().setColor(LILITH_COLOR).setTitle(title);
  if (result.added.length) {
    const chunk = result.added.slice(0, 50).join(" ");
    e.addFields({ name: `✧ added (${result.added.length})`, value: chunk.slice(0, 1020) || "—" });
  }
  if (result.skipped.length) {
    e.addFields({
      name: `⟡ skipped (${result.skipped.length})`,
      value: result.skipped.slice(0, 12).join("\n").slice(0, 1020) || "—",
    });
  }
  if (result.failed.length) {
    e.addFields({
      name: `💀 failed (${result.failed.length})`,
      value: result.failed.slice(0, 8).join("\n").slice(0, 1020) || "—",
    });
  }
  e.setFooter({ text: "bad/NSFW emojis auto-filtered ❖" });
  return e;
}

export const emojiCommands: Command[] = [
  {
    name: "steal",
    description: "+steal — reply to a msg (or paste emojis) to add them to this server",
    aliases: ["yoink", "addemoji"],
    category: "Emojis",
    cooldownMs: 5000,
    run: async ({ message, raw }) => {
      const err = ensureManagerPerms(message);
      if (err) { await message.reply(err); return; }

      let text = raw;
      if (message.reference?.messageId) {
        try {
          const ref = await message.channel.messages.fetch(message.reference.messageId);
          text += "\n" + ref.content;
        } catch {}
      }
      const found = parseCustomEmojis(text);
      if (!found.length) {
        await message.reply(
          "❖ koi emoji nahi mila ❖\n*kisi msg pe reply kar `+steal` likh ke,*\n*ya `+steal <:name:id> <a:name2:id2>` paste kar*",
        );
        return;
      }
      await message.reply(`✧ stealing **${found.length}** emojis...\n*ek minute ruk* ⟡`);
      const result = await uploadEmojis(message.guild!, found, `+steal by ${message.author.tag}`);
      await message.reply({ embeds: [summaryEmbed(`𓆩 STEAL DONE 𓆪`, result)] });
    },
  },
  {
    name: "cloneserver",
    description: "+cloneserver <serverID> — clone all emojis from a server I'm in",
    aliases: ["clonemojis", "stealserver"],
    category: "Emojis",
    cooldownMs: 30000,
    run: async ({ message, args }) => {
      const err = ensureManagerPerms(message);
      if (err) { await message.reply(err); return; }
      const target = message.guild!;

      const id = args[0]?.replace(/[^0-9]/g, "");
      if (!id) {
        await message.reply(
          "✧ usage ✧\n`+cloneserver <serverID>`\n\n*Note: mujhe pehle us server mein add karna padega.*\n*Discord invite link se bot join nahi ho sakta — use OAuth invite.*",
        );
        return;
      }

      const source = message.client.guilds.cache.get(id);
      if (!source) {
        await message.reply(
          `❖ main us server mein nahi hu ❖\n*pehle bot ko us server mein add kar* (Manage Server perm chahiye)\n*phir ye command chala*`,
        );
        return;
      }
      const all = [...source.emojis.cache.values()];
      if (!all.length) {
        await message.reply(`⟡ **${source.name}** mein koi custom emoji nahi hai`);
        return;
      }
      await message.reply(
        `✧ cloning **${all.length}** emojis from **${source.name}**...\n*bad waale skip kar dungi ❖*\n*thoda time lagega — Discord rate-limits emojis*`,
      );
      const items = all.map((e) => ({
        animated: !!e.animated,
        name: e.name ?? `emoji_${e.id.slice(-4)}`,
        id: e.id,
        url: e.imageURL({ size: 128 }) ?? emojiCdnUrl(e.id, !!e.animated),
      }));
      const result = await uploadEmojis(target, items, `+cloneserver from ${source.name} by ${message.author.tag}`);
      await message.reply({ embeds: [summaryEmbed(`𓆩 CLONED ${source.name} 𓆪`, result)] });
    },
  },
  {
    name: "purgebademojis",
    description: "+purgebademojis — remove NSFW/slur-named emojis from this server",
    aliases: ["cleanemojis"],
    category: "Emojis",
    cooldownMs: 30000,
    run: async ({ message }) => {
      const err = ensureManagerPerms(message);
      if (err) { await message.reply(err); return; }
      const guild = message.guild!;
      const bad = guild.emojis.cache.filter((e) => !!e.name && isBadEmojiName(e.name));
      if (!bad.size) {
        await message.reply("✧ saaf hai server ✧\n*koi bad emoji nahi mila* ⟡");
        return;
      }
      const removed: string[] = [];
      const failed: string[] = [];
      for (const e of bad.values()) {
        try {
          await e.delete(`+purgebademojis by ${message.author.tag}`);
          removed.push(e.name!);
        } catch (er: any) {
          failed.push(`${e.name} (${(er?.message || "").slice(0, 40)})`);
        }
        await new Promise((r) => setTimeout(r, 500));
      }
      const embed = new EmbedBuilder()
        .setColor(LILITH_COLOR)
        .setTitle("𓆩 PURGE COMPLETE 𓆪")
        .addFields({ name: `💀 removed (${removed.length})`, value: removed.join(", ").slice(0, 1020) || "—" });
      if (failed.length) embed.addFields({ name: `❖ failed`, value: failed.join("\n").slice(0, 1020) });
      await message.reply({ embeds: [embed] });
    },
  },
  {
    name: "emojicount",
    description: "+emojicount — show emoji slots used",
    category: "Emojis",
    cooldownMs: 3000,
    run: async ({ message }) => {
      const g = message.guild;
      if (!g) { await message.reply("server-only"); return; }
      const total = g.emojis.cache.size;
      const animated = g.emojis.cache.filter((e) => e.animated).size;
      const stat = total - animated;
      const limit = g.premiumTier === 0 ? 50 : g.premiumTier === 1 ? 100 : g.premiumTier === 2 ? 150 : 250;
      await message.reply(
        `✧ **${g.name}** ✧\n` +
          `❖ static: **${stat}/${limit}**\n` +
          `❖ animated: **${animated}/${limit}**\n` +
          `⟡ boost tier: **${g.premiumTier}**`,
      );
    },
  },
];
