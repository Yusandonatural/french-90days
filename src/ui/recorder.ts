// Microphone recording (MediaRecorder). Hidden where unsupported.
import { toast } from './toast';

export const REC_OK = !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function' && typeof window.MediaRecorder === 'function');

let MR: MediaRecorder | null = null;
/** Start recording, or stop if already recording. The button shows the state. */
export async function recToggle(btn: HTMLElement, onDone: (b: Blob) => void, maxSec?: number) {
  if (MR) { MR.stop(); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks: Blob[] = [];
    const mr = MR = new MediaRecorder(stream);
    mr.ondataavailable = e => chunks.push(e.data);
    mr.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
      MR = null;
      btn.textContent = btn.dataset.l || '● 録音';
      btn.classList.remove('rec-on');
      onDone(blob);
    };
    mr.start();
    btn.dataset.l = btn.textContent || '';
    btn.textContent = '■ 停止';
    btn.classList.add('rec-on');
    if (maxSec) setTimeout(() => { if (MR) MR.stop(); }, maxSec * 1000);
  } catch { toast('マイクを使えませんでした（ブラウザの許可を確認してください）'); }
}
export function playBlob(blob: Blob | null | undefined) { if (!blob) return; new Audio(URL.createObjectURL(blob)).play(); }
