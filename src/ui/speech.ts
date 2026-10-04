// Text-to-speech (Web Speech API) and screen wake lock.
const HAS_TTS = typeof window !== 'undefined' && 'speechSynthesis' in window;
export const hasTTS = () => HAS_TTS;

let voice: SpeechSynthesisVoice | null = null, jaVoice: SpeechSynthesisVoice | null = null;
function pickVoice() {
  if (!HAS_TTS) return;
  const vs = speechSynthesis.getVoices();
  voice = vs.find(v => /^fr[-_]FR/i.test(v.lang)) || vs.find(v => /^fr/i.test(v.lang)) || null;
  jaVoice = vs.find(v => /^ja/i.test(v.lang)) || null;
}
export function initSpeech() {
  if (HAS_TTS) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  document.addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLElement>('[data-say]');
    if (b) speak(b.dataset.say!);
  });
}

/** Called before a one-off utterance (the player stops itself here). */
let interrupt: () => void = () => {};
export function setSpeakInterrupt(fn: () => void) { interrupt = fn; }

/** Speak French once, cancelling whatever is playing. */
export function speak(t: string, rate?: number) {
  if (!HAS_TTS) return;
  interrupt();
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(t);
  u.lang = 'fr-FR';
  if (voice) u.voice = voice;
  u.rate = rate || .95;
  speechSynthesis.speak(u);
}
export function cancelSpeech() { if (HAS_TTS) speechSynthesis.cancel(); }

/** Speak and resolve when done. Times out in case onend never fires. */
export function speakP(t: string, lang: string, rate: number) {
  return new Promise<void>(res => {
    if (!HAS_TTS) { setTimeout(res, 600); return; }
    const u = new SpeechSynthesisUtterance(t);
    u.lang = lang;
    const vo = lang.startsWith('fr') ? voice : jaVoice;
    if (vo) u.voice = vo;
    u.rate = rate;
    let done = false;
    const fin = () => { if (!done) { done = true; res(); } };
    u.onend = fin; u.onerror = fin;
    setTimeout(fin, Math.max(4000, t.length * 260 / rate));
    speechSynthesis.speak(u);
  });
}

/* iOS stops speech when the screen turns off, so keep it on while playing. */
let wake: WakeLockSentinel | null = null;
export async function holdWake() { try { if ('wakeLock' in navigator && !wake) wake = await navigator.wakeLock.request('screen'); } catch { /* not allowed */ } }
export function releaseWake() { try { if (wake) { wake.release(); wake = null; } } catch { /* ignore */ } }
