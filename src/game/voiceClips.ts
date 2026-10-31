/**
 * Voice-line registry: line key → bundled clip URL and display text.
 *
 * PLACEHOLDER audio: every clip is ElevenLabs eleven_v4 TTS generated for the
 * first playtest (老師 and 點燈人 Voice Design voices). See THIRD_PARTY_NOTICES.md.
 *
 * voice.ts imports this module lazily, so neither the URL table nor the line
 * text is in the main bundle, and each MP3 is fetched only when it first plays.
 */
import { VOICE_LINES, type VoiceSpeaker } from '../data/voiceLines';

/** Hashed asset URLs only (`?url`); the MP3 bytes stay separate files in dist. */
const CLIP_URLS = import.meta.glob<string>('../assets/audio/voice/**/*.mp3', {
  query: '?url',
  import: 'default',
  eager: true,
});

const CLIP_PREFIX = '../assets/audio/voice/';

export interface ResolvedVoiceLine {
  speaker: VoiceSpeaker;
  url: string | null;
  text: string;
}

export function resolveVoiceLine(key: string): ResolvedVoiceLine | null {
  if (!Object.prototype.hasOwnProperty.call(VOICE_LINES, key)) return null;
  const [speaker, file, text] = VOICE_LINES[key]!;
  return { speaker, url: CLIP_URLS[CLIP_PREFIX + file] ?? null, text };
}
