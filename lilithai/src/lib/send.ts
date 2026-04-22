import type { Message, MessageCreateOptions, MessagePayload } from "discord.js";

export async function sendIn(
  message: Message,
  payload: string | MessagePayload | MessageCreateOptions,
): Promise<Message | null> {
  const ch = message.channel;
  if ("send" in ch && typeof ch.send === "function") {
    try {
      return await ch.send(payload as MessageCreateOptions);
    } catch (e) {
      console.warn("[send] failed", e);
    }
  }
  return null;
}
