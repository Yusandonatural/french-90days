// 動詞: stage / mastery grid / accuracy meters and the four 10-question drill modes.
import { $, $$, cap, esc, rnd, shuffle, focusInView } from '../../util/dom';
import { NST, V, exOf, stageVerbs, type VerbEx } from '../../data';
import {
  FKEYS, FORMS, accepted, acceptedNeg, allowed, build, check, colloq, notesOf, subjFor,
  type CheckResult, type FormKey, type Subj,
} from '../../grammar/conjugate';
import { jaNegOf, jaOf } from '../../grammar/ja';
import { advCandidates, advForm, pickAdv, type Adverb } from '../../grammar/adverbs';
import { ST, lvl, mastered, save } from '../../store/state';
import { SES, recordVerb, sesDone, sesReset } from '../../engine/session';
import { advanceStage, getCourseDay, isAhead, pickVerb, resetLastKey, setCourseDay } from '../../engine/pick';
import { toast } from '../toast';
import { dvEnd } from '../../engine/course';
import { speak } from '../speech';
import { renderSesBar, summaryHTML } from '../components/lesson';
import { onShow } from '../router';
import { openVerb } from './Conj';

/* curated situations */
interface Sit { t: string; s: Subj; v: string; f: FormKey; ja: string; why: string; alt?: FormKey[]; noSubj?: number }
const SIT: Sit[] = [
 {t:"Demain, ___ tôt.",s:'je',v:'partir',f:'al',ja:'明日、私は早く出発する。',why:'demain（明日）は未来。会話の未来は aller ＋不定詞。'},
 {t:"Hier, ___ au restaurant.",s:'on',v:'manger',f:'pc',ja:'昨日、私たちはレストランで食べた。',why:'hier（昨日）は「たった今」ではないので複合過去。会話の「私たち」は nous より on。'},
 {t:"Attends, ___ ! J'enlève encore mon manteau.",s:'je',v:'arriver',f:'vd',alt:['pc'],ja:'待って、着いたばかりなんだ！まだコートを脱いでいるところ。',why:'コートを脱いでいる最中＝着いた直後。venir de がいちばん自然（複合過去も可）。'},
 {t:"Ce soir, ___ un film.",s:'on',v:'regarder',f:'al',ja:'今夜、私たちは映画を観る。',why:'ce soir（今夜）はこれからの予定。'},
 {t:"L'année dernière, ___ au Japon.",s:'tu',v:'aller',f:'pc',ja:'去年、君は日本に行ったよね。',why:"l'année dernière（去年）は過去。aller は être を使う（女性なら allée）。"},
 {t:"Le week-end prochain, qu'est-ce que ___ ?",s:'tu',v:'faire',f:'al',ja:'来週末、何をするの？',why:'le week-end prochain（来週末）は未来。'},
 {t:"Ce matin, ___ trois cafés.",s:'je',v:'boire',f:'pc',ja:'今朝、私はコーヒーを3杯飲んだ。',why:'ce matin（今朝）の出来事を事実として言う。'},
 {t:"Je suis libre : ___ mon travail à l'instant.",s:'je',v:'finir',f:'vd',alt:['pc'],ja:'手が空いたよ。たった今仕事を終えたところ。',why:"à l'instant（たった今）は venir de の定番の相棒（複合過去も可）。"},
 {t:"En 2019, ___ une maison.",s:'on',v:'acheter',f:'pc',ja:'2019年、私たちは家を買った。',why:'年号＝はっきりした過去。'},
 {t:"Regarde le ciel : ___ !",s:'il',v:'pleuvoir',f:'al',ja:'空を見て、雨が降りそう！',why:'今にも起きそうなことは aller ＋不定詞。'},
 {t:"___ ce livre ? — Oui, la semaine dernière.",s:'tu',v:'lire',f:'pc',ja:'この本読んだ？—うん、先週。',why:'la semaine dernière（先週）なので複合過去。'},
 {t:"Le train ___ dans cinq minutes, dépêche-toi !",s:'il',noSubj:1,v:'partir',f:'al',ja:'電車はあと5分で出るよ、急いで！',why:'dans cinq minutes（5分後に）は未来。'},
 {t:"Hier soir, ___ tard.",s:'on',v:'rentrer',f:'pc',ja:'昨夜、私たちは遅く帰ってきた。',why:'hier soir（昨夜）は過去。rentrer は être を使う（on est rentré(s)）。'},
 {t:"Non merci, pas de gâteau : ___.",s:'je',v:'manger',f:'vd',alt:['pc'],ja:'ありがとう、でもケーキはいいです。食べたばかりなので。',why:'「さっき食べたから」は venir de が自然（複合過去も可）。'},
 {t:"___ Paul plus tard ?",s:'tu',v:'appeler',f:'al',ja:'後でポールに電話する？',why:'plus tard（後で）は未来。'},
 {t:"Je suis en forme : ___ dix heures cette nuit.",s:'je',v:'dormir',f:'pc',ja:'元気だよ。昨夜10時間寝たから。',why:'昨夜という過去の出来事。'},
 {t:"Désolé, ___ ! J'ai encore les yeux fermés.",s:'je',v:'se réveiller',f:'vd',alt:['pc'],ja:'ごめん、目が覚めたばかりなんだ！まだ目が開かない。',why:'まだ目が開かない＝目覚めた直後。再帰動詞は je viens de me réveiller。'},
 {t:"Demain, ___ à six heures.",s:'je',v:'se lever',f:'al',ja:'明日、私は6時に起きる。',why:'demain は未来。再帰動詞は je vais me lever。'},
 {t:"Hier, ___ dans la forêt.",s:'on',v:'se promener',f:'pc',ja:'昨日、私たちは森を散歩した。',why:"hier は過去。再帰動詞は être：on s'est promené(s)。"},
 {t:"Tu as l'air fatigué. ___ ?",s:'tu',v:'se coucher',f:'pc',ja:'疲れてるみたい。ちゃんと寝た？',why:"昨夜のことを聞くので複合過去。tu t'es couché ?"}];
/** Start adverb in front of a choice sentence: "Heureusement, hier, ___ …" */
function withStartAdv(t: string, ja: string, f: FormKey, s: Subj) {
  const adv = pickAdv(advForm(f), { pos: ['start'], subj: s });
  if (!adv) return { t, ja };
  return { t: cap(adv.fr) + ', ' + t.charAt(0).toLowerCase() + t.slice(1), ja: adv.ja[advForm(f)] + '、' + ja };
}
/** The adverb shown as a hint above the answer box */
const advHint = (adv?: Adverb) => adv ? `<span class="badge k-pr">副詞：${esc(adv.fr)}</span>` : '';
const capAt = (t: string) => { const i = t.indexOf('___'); return i === 0 || /[.?!]\s*$/.test(t.slice(0, i)); };
const fillT = (t: string, c: string) => t.replace('___', capAt(t) ? cap(c) : c);

/* time markers for generated items */
const MK: Record<'pc' | 'al', [string, string][]> = {
  pc: [['Hier','昨日'],['Ce matin','今朝'],['La semaine dernière','先週'],["L'année dernière",'去年'],['Il y a deux jours','2日前']],
  al: [['Demain','明日'],['Ce soir','今夜'],['Ce week-end','今週末'],['La semaine prochaine','来週'],['Plus tard','後で']],
};

/** set when an answer finishes the stage; the next question moves on to the next stage */
let stageJustCleared = false;

/** Record an answer and refresh the lesson bar and progress. */
export function rec(f: string, ok: boolean, key: string | null, noSes?: boolean) {
  const before = mastered(ST.stage);
  recordVerb(f, ok, key, noSes);
  if (ok && !getCourseDay() && before < 20 && mastered(ST.stage) === 20) stageJustCleared = true;
  if (!noSes && SES.on) renderSesBar();
  renderProgress();
}

/* ---------- progress ---------- */
function setStage(i: number) {
  setCourseDay(0);
  ST.stage = Math.max(0, Math.min(NST - 1, i));
  save(); resetLastKey(); renderProgress(); sesReset('drill'); nextDrill();
}
export function renderProgress() {
  const st = ST.stage, m = mastered(st), vs = stageVerbs(st), cd = getCourseDay();
  $('#stName').innerHTML = cd
    ? `Day ${cd} の動詞 <span>（${dvEnd(cd)}語目まで・今日の新出を多めに）</span>`
    : `ステージ${st + 1} <span>（${vs[0].idx + 1}–${vs[19].idx + 1}）　習得 ${m}/20</span>`;
  $<HTMLButtonElement>('#stPrev').disabled = st === 0;
  $<HTMLButtonElement>('#stNext').disabled = st === NST - 1;
  $('#stClear').innerHTML = m === 20 ? `<div class="clear"><span><b>ステージ${st + 1} クリア。</b>20語すべて習得しました。</span>${st < NST - 1 ? '<button class="btn" id="goNext">ステージ' + (st + 2) + 'へ進む</button>' : ''}</div>` : '';
  const gn = $('#goNext'); if (gn) gn.onclick = () => setStage(st + 1);
  let g = '';
  for (let i = 0; i < NST; i++) {
    g += `<span class="rl${i === st ? ' cur' : ''}">${i + 1}</span>`;
    stageVerbs(i).forEach(v => { g += `<button class="cell m${lvl(v.key)}${i === st ? ' cur' : ''}" data-k="${esc(v.key)}" title="${esc(v.key)}" aria-label="${esc(v.key)}"></button>`; });
  }
  $('#grid').innerHTML = g;
  $('#meter').innerHTML = ([...FKEYS, 'neg'] as const).map(f => {
    const [c, n] = ST.forms[f]; const p = n ? Math.round(c / n * 100) : 0;
    const lab = f === 'neg' ? '否定' : FORMS[f].ja, cls = f === 'neg' ? 'k-pr' : FORMS[f].cls;
    return `<div class="${cls}"><span style="color:var(--c);font-weight:700">${lab}</span> ${n ? p + '%' : '—'}<div class="bar"><i style="width:${p}%"></i></div></div>`;
  }).join('');
  $('#streak').textContent = `解いた数 ${ST.total}　連続正解 ${ST.streak}（最高 ${ST.best}）`;
}

const vtag = (v: VerbEx) => `<p class="vtag">${v.idx + 1}. <b>${esc(v.key)}</b>　例文${(v.exi || 0) + 1}/${v.ex.length}${isAhead(v) ? '　先取り' : !getCourseDay() && v.stage < ST.stage ? '　復習' : ''}</p>`;

/* ---------- drill ---------- */
type Mode = 'choice' | 'compose' | 'transform' | 'neg';
let mode: Mode = 'choice';

export function nextDrill() {
  if (!SES.on || SES.kind !== 'drill') sesReset('drill');
  if (sesDone()) {
    $('#drill').innerHTML = summaryHTML();
    $('#again').onclick = () => { sesReset('drill'); nextDrill(); };
    renderSesBar(); renderProgress();
    return;
  }
  if (stageJustCleared) {
    stageJustCleared = false;
    const done = ST.stage, next = advanceStage();
    if (next != null) { save(); resetLastKey(); renderProgress(); toast(`ステージ${done + 1} 習得！ ステージ${next + 1}へ進みます`); }
  }
  ({ choice: renderChoice, compose: renderCompose, transform: renderTransform, neg: renderNegDrill })[mode]();
  renderSesBar();
}

function renderNegDrill() {
  const v = exOf(pickVerb()), s = rnd(subjFor(v)), al = allowed(v).filter(f => f !== 'vd') as ('pc' | 'al')[], base = rnd(al);
  // an adverb that survives negation: start / end ones, or mid ones with a negative partner (déjà → pas encore)
  const fa = advForm(base);
  const adv = rnd(advCandidates(fa, { subj: s }).filter(a => a.pos !== 'mid' || (a.neg && a.neg.forms.includes(fa))));
  const src = build(s, v, base, { adv }), acc = acceptedNeg(s, v, base, adv), f = (base + 'n') as 'pcn' | 'aln';
  $('#drill').innerHTML = `${vtag(v)}<p class="label">この文を否定文にしてください</p>
   <p class="q fr ${FORMS[base].cls}" style="color:var(--c)">${esc(src)} <button class="say" data-say="${esc(src)}" aria-label="発音">▶</button></p>
   <p><span class="badge ${FORMS[f].cls}">${FORMS[f].ja}　${FORMS[f].hint}</span></p>${inputBlock()}`;
  const ja = jaNegOf(s, v, base, adv);
  const tip = `${ja ? `<p class="small muted" style="margin:0">${esc(ja)}</p>` : ''}<p class="small muted" style="margin:4px 0 0">会話では ne を省くことも多い：${esc(colloq(acc[0]))}</p>`;
  wireAnswer(acc, f, v.key, tip);
}

interface ChoiceItem { t: string; ja: string; why: string; f: FormKey; alt: FormKey[]; v: VerbEx; chunks: Record<FormKey, string> }
function genChoice(): ChoiceItem {
  const v = exOf(pickVerb()); const f = rnd(allowed(v)); const s = rnd(subjFor(v));
  let t: string, ja: string, why: string, alt: FormKey[] = [];
  const chunk = (g: FormKey) => build(s, v, g, { obj: false, sentence: false });
  const obj = v.obj ? ' ' + v.obj : '';
  if (f === 'vd') {
    t = '___' + obj + " à l'instant."; ja = jaOf(s, v, 'vd', 'たった今');
    why = "à l'instant（たった今）は venir de の定番の相棒。複合過去でも言えますが、「したばかり」を強調するなら venir de。";
    alt = ['pc'];
  } else {
    const [m, mj] = rnd(MK[f]); t = m + ', ___' + obj + '.'; ja = jaOf(s, v, f, mj);
    why = f === 'pc' ? `${m}（${mj}）は過去の時点なので複合過去。` : `${m}（${mj}）はこれからのことなので aller ＋ 不定詞。`;
  }
  if (f === 'pc' && v.etre) why += v.R ? ' 再帰動詞は être を使います。' : ' この動詞は être を使います。';
  ({ t, ja } = withStartAdv(t, ja, f, s));
  return { t, ja, why, f, alt, v, chunks: Object.fromEntries(FKEYS.map(g => [g, chunk(g)])) as Record<FormKey, string> };
}
function curatedChoice(): ChoiceItem {
  const it = rnd(SIT), v = V[it.v];
  const { t, ja } = withStartAdv(it.t, it.ja, it.f, it.s);
  return { t, ja, why: it.why, f: it.f, alt: it.alt || [], v, chunks: Object.fromEntries(FKEYS.map(g => [g, build(it.s, v, g, { obj: false, sentence: false, noSubj: it.noSubj })])) as Record<FormKey, string> };
}
function renderChoice() {
  const it = (Math.random() < .2 && ST.stage <= 5) ? curatedChoice() : genChoice();
  $('#drill').innerHTML = `${vtag(it.v)}<p class="label">空所に入る自然な形は？</p>
   <p class="q fr">${esc(it.t).replace('___', '<span class="blank">______</span>')}</p>
   <button class="linkbtn" id="showJa">日本語訳を見る</button><p class="small muted" id="ja" hidden>${esc(it.ja)}</p>
   <div class="opts">${shuffle(FKEYS).map(f => `<button class="opt fr" data-f="${f}">${esc(capAt(it.t) ? cap(it.chunks[f]) : it.chunks[f])}</button>`).join('')}</div>
   <div id="fb"></div>`;
  $('#showJa').onclick = () => { $('#ja').hidden = false; $('#showJa').remove(); };
  $$<HTMLButtonElement>('#drill .opt').forEach(b => b.onclick = () => {
    const f = b.dataset.f as FormKey, ok = f === it.f || it.alt.includes(f);
    $$<HTMLButtonElement>('#drill .opt').forEach(x => { x.disabled = true; if (x.dataset.f === it.f) x.classList.add('right'); });
    if (!ok) b.classList.add('wrong');
    rec(it.f, ok, it.v.key);
    const full = fillT(it.t, it.chunks[it.f]);
    $('#ja').hidden = false; const sj = $('#showJa'); if (sj) sj.remove();
    const verdict = ok ? (f === it.f ? '正解' : '正解（ただし ' + FORMS[it.f].ja + ' がより自然）') : '惜しい';
    $('#fb').innerHTML = `<div class="fb ${ok ? 'good' : 'bad'}"><span class="verdict">${verdict}</span>
      <p class="fr" style="font-size:19px;margin:6px 0">${esc(full)} <button class="say" data-say="${esc(full)}" aria-label="発音">▶</button></p>
      <p class="small" style="margin:0">${esc(it.why)}</p></div>
      <div class="actions"><button class="btn" id="nx">次へ</button></div>`;
    speak(full); $('#nx').onclick = nextDrill; focusInView($('#nx'));
  });
}

/* ---------- typed answers ---------- */
function accentBar() { return `<div class="accents">${['é', 'è', 'ê', 'à', 'ç', 'ô', 'î', 'û', "'"].map(c => `<button type="button" data-ins="${c}">${c}</button>`).join('')}</div>`; }
function inputBlock() {
  return `<input class="answer" id="ans" autocomplete="off" autocapitalize="off" spellcheck="false" lang="fr" placeholder="ここに入力">${accentBar()}
   <div class="actions"><button class="btn" id="chk">答え合わせ</button><button class="btn ghost" id="give">答えを見る</button></div><div id="fb"></div>`;
}
/** Accent buttons, Enter, 答え合わせ and 答えを見る for the #ans input. */
function wireAnswer(acc: string[], f: string, key: string, tip: string) {
  const inp = $<HTMLInputElement>('#ans');
  const run = () => { const r = check(inp.value, acc); if (r === 'empty') return; showResult(r, acc, f, key, tip); };
  $$('#drill [data-ins]').forEach(b => b.onclick = () => {
    const p = inp.selectionStart ?? inp.value.length;
    inp.value = inp.value.slice(0, p) + b.dataset.ins + inp.value.slice(inp.selectionEnd ?? p);
    inp.focus(); inp.setSelectionRange(p + 1, p + 1);
  });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); run(); } });
  $('#chk').onclick = run;
  $('#give').onclick = () => showResult('giveup', acc, f, key, tip);
}
function showResult(res: CheckResult | 'giveup', acc: string[], f: string, key: string, extra: string) {
  const ok = res === 'ok' || res === 'accent';
  rec(f, ok, key);
  const ans = acc[0];
  const v = res === 'ok' ? '正解' : res === 'accent' ? '正解（アクセント記号だけ確認を）' : res === 'giveup' ? '答え' : 'もう一歩';
  $('#fb').innerHTML = `<div class="fb ${ok ? 'good' : 'bad'}"><span class="verdict">${v}</span>
    <p class="fr" style="font-size:19px;margin:6px 0">${esc(ans)} <button class="say" data-say="${esc(ans)}" aria-label="発音">▶</button></p>
    ${acc.length > 1 ? `<p class="small muted" style="margin:0">別解：${acc.slice(1).map(esc).join(' / ')}</p>` : ''}
    ${extra || ''}</div>
    <div class="actions"><button class="btn" id="nx">次へ</button></div>`;
  $<HTMLButtonElement>('#chk').disabled = true; $<HTMLButtonElement>('#give').disabled = true; $<HTMLInputElement>('#ans').readOnly = true;
  speak(ans); $('#nx').onclick = nextDrill; focusInView($('#nx'));
}

function renderCompose() {
  const v = exOf(pickVerb()), s = rnd(subjFor(v));
  const base = rnd(allowed(v));
  let f: string = base, acc: string[] | undefined, ja = '', adv: Adverb | undefined;
  if (base !== 'vd' && Math.random() < .3) {
    adv = pickAdv(advForm(base), { neg: true, subj: s });
    const jn = jaNegOf(s, v, base, adv); if (jn) { ja = jn; acc = acceptedNeg(s, v, base, adv); f = base + 'n'; }
  }
  if (!acc) { adv = pickAdv(advForm(base), { subj: s }); acc = accepted(s, v, base, { adv }); ja = jaOf(s, v, base, undefined, adv); }
  $('#drill').innerHTML = `${vtag(v)}<p class="label">フランス語で書いてください${f.endsWith('n') ? '　<span class="badge k-pr">否定</span>' : ''}</p>
   <p class="prompt-ja"><span class="subj-hint">${s}</span>${esc(ja)}</p><p style="margin:0">${advHint(adv)}</p>${inputBlock()}`;
  const tip = notesOf(v).length ? `<p class="small muted" style="margin:6px 0 0">${esc(notesOf(v)[0])}</p>` : '';
  wireAnswer(acc, f, v.key, tip);
}
function renderTransform() {
  const v = exOf(pickVerb(x => allowed(x).length >= 2)), s = rnd(subjFor(v)), al = allowed(v);
  const from = rnd(al), to = rnd(al.filter(x => x !== from));
  // the same adverb has to fit both forms
  const adv = rnd(advCandidates(advForm(from), { subj: s }).filter(a => a.forms.includes(advForm(to))));
  const src = build(s, v, from, { adv }), acc = accepted(s, v, to, { adv });
  $('#drill').innerHTML = `${vtag(v)}<p class="label">この文を別の形に変えてください</p>
   <p class="q fr ${FORMS[from].cls}" style="color:var(--c)">${esc(src)} <button class="say" data-say="${esc(src)}" aria-label="発音">▶</button></p>
   <p><span class="badge ${FORMS[to].cls}">${FORMS[to].ja}　${FORMS[to].hint}</span> に変える</p>${inputBlock()}`;
  const tip = `<p class="small muted" style="margin:0">${esc(jaOf(s, v, to, undefined, adv))}</p>`;
  wireAnswer(acc, to, v.key, tip);
}

/** Open the drill on Day N's verbs (from the course 復習 block). */
export function startDayDrill(d: number) { setCourseDay(d); sesReset('drill'); renderProgress(); nextDrill(); }

export function initDrill() {
  $('#stPrev').onclick = () => setStage(ST.stage - 1);
  $('#stNext').onclick = () => setStage(ST.stage + 1);
  $('#grid').onclick = e => { const b = (e.target as Element).closest<HTMLElement>('[data-k]'); if (b) openVerb(b.dataset.k!); };
  $('#modeSeg').onclick = e => {
    const b = (e.target as Element).closest<HTMLElement>('[data-m]'); if (!b) return;
    mode = b.dataset.m as Mode;
    $$('#modeSeg button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    sesReset('drill'); nextDrill();
  };
  onShow('drill', () => { if (!(SES.on && SES.kind === 'drill')) nextDrill(); });
}
