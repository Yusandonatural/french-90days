// 話す: today's phrases, verb sentences, review, self-introduction (and role plays in month 3).
import { $, $$, esc, shuffle } from '../../util/dom';
import { MEAN, withEx } from '../../data';
import { allowed, build, buildNeg, subj0, type FormKey } from '../../grammar/conjugate';
import { jaNegOf, jaOf } from '../../grammar/ja';
import { advForm, pickAdv } from '../../grammar/adverbs';
import { C, ROLES, curDay, dayVerbs, focusCats, monthOf, personal } from '../../engine/course';
import { REC_OK, playBlob, recToggle } from '../recorder';
import { speak } from '../speech';
import { onShow } from '../router';

/** Japanese first; 答えを見る reveals the French and reads it aloud. */
const card = (ja: string, fr: string, tag?: string) => `<div class="spc"><div class="spj">${tag ? `<span class="badge k-pr">${esc(tag)}</span> ` : ''}${esc(ja)}</div><div class="spf fr" hidden>${esc(fr)}</div>
    <div class="actions" style="margin-top:6px"><button class="btn sm ghost" data-rev>答えを見る</button><button class="say" data-say="${esc(fr)}" aria-label="発音">▶</button>${REC_OK ? '<button class="btn sm ghost" data-rec>● 録音</button><button class="btn sm ghost" data-pb disabled>▶ 自分の声</button>' : ''}</div></div>`;

export function renderSpeak() {
  const c = C(), d = c ? curDay() : 0, el = $('#spk');
  if (!c) {
    el.innerHTML = `<p class="muted">ホームで Day 0 診断をすると、その日の「話す」メニューがここに出ます。今はフレーズ全体から練習できます。</p>` + shuffle(MEAN).slice(0, 8).map(m => card(m.ja, m.fr, m.cat)).join('');
    wireSpk();
    return;
  }
  const newM = MEAN.filter(x => x.day === d), revM = shuffle(MEAN.filter(x => x.day < d)).slice(0, newM.length ? 4 : 8);
  const fc = focusCats();
  const focus = shuffle(MEAN.filter(x => x.day <= d && fc.includes(x.cat) && !newM.includes(x) && !revM.includes(x))).slice(0, 2);
  const vs = dayVerbs(d).map(v => withEx(v, Math.floor(Math.random() * v.ex.length)));
  // Hier + pc / Demain + al / Hier + negative pc, by turns
  const mk: [string, string, string][] = [['pc', 'Hier', '昨日'], ['al', 'Demain', '明日'], ['pcn', 'Hier', '昨日']];
  const verbLines = vs.flatMap((v, i): [string, string][] => {
    const al = allowed(v); const [f, m, mj] = mk[i % 3]; const b = f.replace('n', '') as FormKey;
    if (!al.includes(b)) return [];
    const s = subj0(v);
    // Hier / Demain already start the sentence, so the adverb goes in the middle or at the end
    if (f.endsWith('n')) {
      const adv = pickAdv(advForm(b), { neg: true, subj: s, pos: ['neg', 'end'] });
      const ja = jaNegOf(s, v, b, adv); if (!ja) return [];
      return [[mj + '、' + ja, m + ', ' + buildNeg(s, v, b as 'pc', { sentence: false, adv }) + '.']];
    }
    const adv = pickAdv(advForm(b), { subj: s, pos: ['mid', 'end'] });
    return [[jaOf(s, v, b, mj, adv), m + ', ' + build(s, v, b, { sentence: false, adv }) + '.']];
  });
  const mon = monthOf(d);
  const role = mon === 2 ? ROLES[(d - 61) % ROLES.length] : null;
  el.innerHTML = `<p class="small muted">Day ${d}　まず日本語を見て声に出し、それから答えを見て音声をまねします。録音して聞き返すと効果が上がります。</p>
   ${role ? `<h2>ロールプレイ：${esc(role.t)}</h2><p class="small muted">${esc(role.d)}</p>${role.lines.map(i => card(MEAN[i].ja, MEAN[i].fr, MEAN[i].cat)).join('')}` : ''}
   ${newM.length ? `<h2>今日の新しいフレーズ</h2>${newM.map(m => card(m.ja, m.fr, m.cat)).join('')}` : ''}
   ${verbLines.length ? `<h2>今日の動詞で言ってみる</h2>${verbLines.map(x => card(x[0], x[1])).join('')}` : ''}
   <h2>復習</h2>${[...revM, ...focus].map(m => card(m.ja, m.fr, m.cat)).join('')}
   <h2>自己紹介</h2><p class="small muted">${mon === 0 ? '1ヶ月目は自己紹介を毎日声に出して、口から自然に出るようにします。' : 'つっかえずに30秒で言えるか、時々確かめましょう。'}</p>${personal().map(x => card(x[0], x[1])).join('')}
   ${mon === 2 ? '<p class="small" style="margin-top:16px">3ヶ月目は、週1〜2回、オンライン会話や身近なフランス語話者と10〜15分話してみてください。話した後に、言えなかったことをメモ欄に書きます。</p>' : ''}`;
  wireSpk();
}

function wireSpk() {
  $$('#spk .spc').forEach(c => {
    const r = c.querySelector<HTMLElement>('[data-rev]')!;
    r.onclick = () => { c.querySelector<HTMLElement>('.spf')!.hidden = false; r.remove(); const s = c.querySelector<HTMLElement>('.say'); if (s) speak(s.dataset.say!); };
    const rb = c.querySelector<HTMLElement>('[data-rec]'), pb = c.querySelector<HTMLButtonElement>('[data-pb]');
    let blob: Blob | null = null;
    if (rb) rb.onclick = () => recToggle(rb, b => { blob = b; pb!.disabled = false; }, 20);
    if (pb) pb.onclick = () => playBlob(blob);
  });
}

export function initSpeak() { onShow('speak', renderSpeak); }
