// 文法の説明: static markup in index.html, plus the auxiliary-verb table.
import { $, esc } from '../../util/dom';
import { CONJ, SUBJ, subjWord } from '../../grammar/conjugate';

export function initLearn() {
  let h = '<tr><th>主語</th><th class="col-pc">avoir</th><th class="col-pc">être</th><th class="col-vd">venir</th><th class="col-al">aller</th></tr>';
  SUBJ.forEach(s => {
    const cell = (aux: keyof typeof CONJ) => {
      const t = subjWord(s.k, CONJ[aux][s.k]);
      return `<td class="fr"><button class="linkbtn" style="font:inherit;color:inherit;text-decoration:none" data-say="${esc(t)}">${esc(t)}</button></td>`;
    };
    h += `<tr><th>${s.k}</th>${cell('avoir')}${cell('etre')}${cell('venir')}${cell('aller')}</tr>`;
  });
  $('#auxTable').innerHTML = h;
}
