// Footer links: copy / restore progress between devices or domains, and reset.
import { $ } from '../../util/dom';
import { KEY, PLAYER_KEY, resetState } from '../../store/state';
import { sesReset } from '../../engine/session';
import { toast } from '../toast';
import { renderProgress } from './Drill';
import { renderConj } from './Conj';
import { renderHome } from './Home';

const BK_KEYS = [KEY, PLAYER_KEY];

export function initFooter() {
  $('#bkCopy').onclick = async () => {
    const o: Record<string, string> = {};
    BK_KEYS.forEach(k => { try { const v = localStorage.getItem(k); if (v) o[k] = v; } catch { /* ignore */ } });
    const t = 'TF1:' + btoa(unescape(encodeURIComponent(JSON.stringify(o))));
    try { await navigator.clipboard.writeText(t); toast('進み具合をコピーしました。移行先で「貼り付けて復元」を押してください'); }
    catch { prompt('この文字列をすべてコピーしてください', t); }
  };
  $('#bkPaste').onclick = () => {
    const t = prompt('コピーした進み具合（TF1: で始まる文字列）を貼り付けてください');
    if (!t) return;
    try {
      const o = JSON.parse(decodeURIComponent(escape(atob(t.trim().replace(/^TF1:/, ''))))) as Record<string, string>;
      if (!confirm('この端末の進み具合を上書きして復元しますか？')) return;
      Object.entries(o).forEach(([k, v]) => { if (BK_KEYS.includes(k)) localStorage.setItem(k, v); });
      location.reload();
    } catch { alert('読み込めませんでした。文字列が途中で切れていないか確認してください'); }
  };
  $('#reset').onclick = () => {
    if (confirm('成績をリセットしますか？')) { resetState(); renderProgress(); sesReset('drill'); renderConj(); renderHome(); }
  };
}
