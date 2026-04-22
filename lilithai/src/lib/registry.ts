import type { Message } from "discord.js";

export interface CommandContext {
  message: Message;
  args: string[];
  raw: string;
}

export interface Command {
  name: string;
  description: string;
  category: string;
  aliases?: string[];
  cooldownMs?: number;
  run: (ctx: CommandContext) => Promise<void>;
}

const commands = new Map<string, Command>();
const aliasIndex = new Map<string, string>();
const cooldowns = new Map<string, number>();

export function registerCommand(cmd: Command) {
  commands.set(cmd.name.toLowerCase(), cmd);
  for (const a of cmd.aliases ?? []) aliasIndex.set(a.toLowerCase(), cmd.name.toLowerCase());
}

export function registerAll(cmds: Command[]) {
  for (const c of cmds) registerCommand(c);
}

export function getCommand(name: string): Command | undefined {
  const lower = name.toLowerCase();
  return commands.get(lower) ?? commands.get(aliasIndex.get(lower) ?? "");
}

export function allCommands(): Command[] {
  return [...commands.values()];
}

export function checkCooldown(userId: string, cmd: Command): number {
  if (!cmd.cooldownMs) return 0;
  const key = `${cmd.name}:${userId}`;
  const last = cooldowns.get(key) ?? 0;
  const remaining = last + cmd.cooldownMs - Date.now();
  if (remaining > 0) return remaining;
  cooldowns.set(key, Date.now());
  return 0;
}
