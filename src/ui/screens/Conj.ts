// 活用表: one verb in the three forms, for each subject.
import { $, $$, esc } from '../../util/dom';
import { NST, V, stageVerbs, withEx } from '../../data';
import { FKEYS, FORMS, allowed, build, notesOf, subjFor, type FormKey, type Subj } from '../../grammar/conjugate';
import { jaOf } from '../../grammar/ja';
import { ST, lvl, mastered } from '../../store/state';
import { go, onShow } from '../router';

let cst = ST.stage, cv = stageVerbs(ST.stage)[0].key, cs: Subj = 'je', tf: FormKey = 'pc', ce = 0;

export function renderConj() {
  $('#stageChips').innerHTML = Array.from({ length: NST }, (_, i) => `<button class="chip" aria-pressed="${i === cst}" data-st="${i}">${i + 1}${mastered(i) === 20 ? ' ✓' : ''}</button>`).join('');
  $('#verbChips').innerHTML = stageVerbs(cst).map(v => `<button class="chip fr m${lvl(v.key)}" aria-pressed="${v.key === cv}" data-v="${esc(v.key)}"><span class="muted small" style="font-family:inherit">${v.idx + 1}</span> ${esc(v.key)}</button>`).join('');
  const base = V[cv];
  if (ce >= base.ex.length) ce = 0;
  const v = withEx(base, ce), subs = subjFor(v);
  if (!subs.includes(cs)) cs = subs[0];
  $('#exChips').innerHTML = base.ex.map((e, i) => `<button class="chip fr" aria-pressed="${i === ce}" data-e="${i}">${esc(e.obj || '—')}</button>`).join('');
  $('#vnotes').innerHTML = notesOf(v).map(n => `<li>${esc(n)}</li>`).join('');
  $('#subjChips').innerHTML = subs.map(s => `<button class="chip fr" aria-pressed="${s === cs}" data-s="${s}">${s}</button>`).join('');
  const al = allowed(v);
  $('#trio').innerHTML = FKEYS.map(f => {
    const fr = build(cs, v, f), rare = !al.includes(f);
    return `<div class="card ${FORMS[f].cls}${rare ? ' rare' : ''}"><span class="badge">${FORMS[f].ja}　${FORMS[f].hint}</span>${rare ? ' <span class="small muted">あまり使わない</span>' : ''}<div class="row"><span class="fr">${esc(fr)}</span><button class="say" data-say="${esc(fr)}" aria-label="発音">▶</button></div>${rare ? '' : `<span class="small muted">${esc(jaOf(cs, v, f))}</span>`}</div>`;
  }).join('');
  let h = `<tr><th>主語</th><th>${FORMS[tf].ja}</th><th></th></tr>`;
  subs.forEach(s => { const fr = build(s, v, tf); h += `<tr><th>${s}</th><td class="fr col-${tf}">${esc(fr)}</td><td><button class="say" data-say="${esc(fr)}" aria-label="発音">▶</button></td></tr>`; });
  $('#fullTable').innerHTML = h;
}

/** Open the table on one verb (from the mastery grid). */
export function openVerb(key: string) { const v = V[key]; cst = v.stage; cv = key; ce = 0; go('conj'); }

export function initConj() {
  const pick = (e: Event, attr: string) => (e.target as Element).closest<HTMLElement>(`[${attr}]`);
  $('#stageChips').onclick = e => { const b = pick(e, 'data-st'); if (!b) return; cst = +b.dataset.st!; cv = stageVerbs(cst)[0].key; ce = 0; renderConj(); };
  $('#verbChips').onclick = e => { const b = pick(e, 'data-v'); if (b) { cv = b.dataset.v!; ce = 0; renderConj(); } };
  $('#exChips').onclick = e => { const b = pick(e, 'data-e'); if (b) { ce = +b.dataset.e!; renderConj(); } };
  $('#subjChips').onclick = e => { const b = pick(e, 'data-s'); if (b) { cs = b.dataset.s as Subj; renderConj(); } };
  $('#tableSeg').onclick = e => {
    const b = pick(e, 'data-f'); if (!b) return;
    tf = b.dataset.f as FormKey;
    $$('#tableSeg button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    renderConj();
  };
  onShow('conj', renderConj);
}
