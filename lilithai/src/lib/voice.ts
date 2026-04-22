import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  StreamType,
  getVoiceConnection,
  type VoiceConnection,
  type AudioPlayer,
} from "@discordjs/voice";
import { Readable } from "node:stream";
import type { GuildMember, VoiceBasedChannel } from "discord.js";

const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY ?? "";

export const LILITH_VOICE_ID =
  process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL";

const ELEVEN_MODEL = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";

interface SessionState {
  connection: VoiceConnection;
  player: AudioPlayer;
  guildId: string;
  channelId: string;
  queue: Buffer[];
  playing: boolean;
  stopRequested: boolean;
}

const sessions = new Map<string, SessionState>();

export function getSession(guildId: string): SessionState | undefined {
  return sessions.get(guildId);
}

export function isInVoice(guildId: string): boolean {
  return !!getVoiceConnection(guildId);
}

export async function joinUserVoice(member: GuildMember): Promise<SessionState> {
  const channel: VoiceBasedChannel | null = member.voice.channel;
  if (!channel) throw new Error("Tu pehle kisi VC me ja, phir bula 🎤");
  if (!channel.joinable) throw new Error("Is VC me jaane ki permission nahi hai 🚫");
  if ("speakable" in channel && !(channel as any).speakable) {
    throw new Error("Yahan bolne ki permission nahi mili 🤐");
  }

  const existing = sessions.get(channel.guildId);
  if (existing && existing.channelId === channel.id) return existing;

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guildId,
    adapterCreator: channel.guild.voiceAdapterCreator,
    selfDeaf: false,
    selfMute: false,
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 45000);
  } catch (e: any) {
    console.error("[voice] entersState Ready failed:", e?.message, e);
    try { connection.destroy(); } catch {}
    throw new Error(`VC connect fail: ${e?.message || "timeout"} 💀`);
  }

  const player = createAudioPlayer();
  connection.subscribe(player);

  const state: SessionState = {
    connection,
    player,
    guildId: channel.guildId,
    channelId: channel.id,
    queue: [],
    playing: false,
    stopRequested: false,
  };

  player.on("error", (err) => console.error("[voice] player error", err));
  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5000),
      ]);
    } catch {
      try { connection.destroy(); } catch {}
      sessions.delete(channel.guildId);
    }
  });

  sessions.set(channel.guildId, state);
  return state;
}

export function leaveVoice(guildId: string): boolean {
  const s = sessions.get(guildId);
  if (s) {
    s.stopRequested = true;
    try { s.player.stop(true); } catch {}
    try { s.connection.destroy(); } catch {}
    sessions.delete(guildId);
    return true;
  }
  const conn = getVoiceConnection(guildId);
  if (conn) {
    try { conn.destroy(); } catch {}
    return true;
  }
  return false;
}

export async function elevenLabsTTS(text: string, voiceId = LILITH_VOICE_ID): Promise<Buffer> {
  if (!ELEVEN_KEY) throw new Error("ELEVENLABS_API_KEY missing");
  const trimmed = text.trim().slice(0, 900);
  if (!trimmed) throw new Error("Empty TTS text");

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVEN_KEY,
      "content-type": "application/json",
      accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: trimmed,
      model_id: ELEVEN_MODEL,
      voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.6, use_speaker_boost: true },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ElevenLabs ${res.status}: ${body.slice(0, 200)}`);
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

async function playBuffer(state: SessionState, buf: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const stream = Readable.from(buf);
    const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });
    const onIdle = () => {
      state.player.off("error", onErr);
      resolve();
    };
    const onErr = (e: Error) => {
      state.player.off(AudioPlayerStatus.Idle, onIdle);
      reject(e);
    };
    state.player.once(AudioPlayerStatus.Idle, onIdle);
    state.player.once("error", onErr);
    state.player.play(resource);
  });
}

async function processQueue(state: SessionState) {
  if (state.playing) return;
  state.playing = true;
  try {
    while (state.queue.length && !state.stopRequested) {
      const buf = state.queue.shift()!;
      try {
        await playBuffer(state, buf);
      } catch (e) {
        console.error("[voice] play error", e);
      }
      if (state.stopRequested) break;
      await new Promise((r) => setTimeout(r, 350));
    }
  } finally {
    state.playing = false;
    state.stopRequested = false;
  }
}

export async function speak(member: GuildMember, text: string): Promise<void> {
  const state = await joinUserVoice(member);
  const audio = await elevenLabsTTS(text);
  state.queue.push(audio);
  await processQueue(state);
}

export async function speakLines(member: GuildMember, lines: string[]): Promise<void> {
  const state = await joinUserVoice(member);
  for (const line of lines) {
    if (!line?.trim()) continue;
    try {
      const audio = await elevenLabsTTS(line);
      state.queue.push(audio);
    } catch (e) {
      console.error("[voice] tts error for line", e);
    }
  }
  await processQueue(state);
}

export function stopSpeaking(guildId: string): boolean {
  const s = sessions.get(guildId);
  if (!s) return false;
  s.stopRequested = true;
  s.queue = [];
  try { s.player.stop(true); } catch {}
  return true;
}

export function isElevenLabsConfigured(): boolean {
  return !!ELEVEN_KEY;
}
