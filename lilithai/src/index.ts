import { Client, GatewayIntentBits, Partials, type Message } from "discord.js";
import { handleAutoReactions } from "./lib/autoreact.js";
import { getCommand, registerAll, checkCooldown } from "./lib/registry.js";
import { funCommands } from "./commands/fun.js";
import { socialCommands } from "./commands/social.js";
import { gameCommands } from "./commands/games.js";
import { storyCommands } from "./commands/story.js";
import { utilCommands } from "./commands/util.js";
import { voiceCommands } from "./commands/voice.js";
import { emojiCommands } from "./commands/emojis.js";

const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) {
  console.error("DISCORD_TOKEN missing");
  process.exit(1);
}

const PREFIX = "+";

registerAll(funCommands);
registerAll(socialCommands);
registerAll(gameCommands);
registerAll(storyCommands);
registerAll(utilCommands);
registerAll(voiceCommands);
registerAll(emojiCommands);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

client.once("clientReady", (c) => {
  console.log(`[lilithai] ready as ${c.user.tag}`);
  c.user.setPresence({
    activities: [{ name: "+help • chai aur chaos ☕", type: 4 }],
    status: "online",
  });
});

async function handleCommand(message: Message) {
  const body = message.content.slice(PREFIX.length).trim();
  if (!body) {
    await message.reply("Kuch likh: `+help` ya `+crazy <whatever>` 💅").catch(() => {});
    return;
  }
  const [name, ...args] = body.split(/\s+/);
  if (!name) return;
  const cmd = getCommand(name);
  if (!cmd) {
    await message
      .reply(`\`+${name}\` jaisa kuch nahi hai. Try \`+crazy ${name} ${args.join(" ")}\` ya \`+help\` 🙃`)
      .catch(() => {});
    return;
  }
  const remaining = checkCooldown(message.author.id, cmd);
  if (remaining > 0) {
    await message
      .reply(`Sabra rakho, \`${cmd.name}\` ${Math.ceil(remaining / 1000)}s baad chalega ⏳`)
      .catch(() => {});
    return;
  }
  try {
    await cmd.run({ message, args, raw: body });
  } catch (e) {
    console.error("[lilithai] command error", cmd.name, e);
    await message.reply("Internal chai overflow ☕💀 phir try kar.").catch(() => {});
  }
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content) return;

  if (message.content.startsWith(PREFIX)) {
    await handleCommand(message);
    return;
  }
  await handleAutoReactions(message);
});

client.on("error", (e) => console.error("[lilithai] client error", e));
process.on("unhandledRejection", (e) => console.error("[lilithai] unhandled", e));

client.login(TOKEN).catch((e) => {
  console.error("[lilithai] login failed", e);
  process.exit(1);
});
