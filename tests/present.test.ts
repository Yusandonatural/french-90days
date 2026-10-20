// Present tense (現在形) for every subject, as a fourth form.
import { describe, expect, test } from 'vitest';
import { V, VERBS, withEx } from '../src/data';
import { FKEYS, accepted, acceptedNeg, allowed, build, buildNeg, check, presFor, presFr, subjFor, type Subj } from '../src/grammar/conjugate';
import { jaNegOf, jaOf } from '../src/grammar/ja';
import { ADVERBS } from '../src/grammar/adverbs';

const P = (inf: string) => VERBS.find(v => v.key === inf)!;
const conj = (inf: string) => (['je', 'tu', 'on'] as Subj[]).map(s => presFor(s, P(inf)));

describe('present tense', () => {
  test('is the first of the four forms and allowed for every verb', () => {
    expect(FKEYS).toEqual(['pr', 'pc', 'vd', 'al']);
    for (const v of VERBS) expect(allowed(v)[0]).toBe('pr');
  });

  test.each([
    ['être', ['suis', 'es', 'est']], ['avoir', ['ai', 'as', 'a']], ['aller', ['vais', 'vas', 'va']],
    ['faire', ['fais', 'fais', 'fait']], ['prendre', ['prends', 'prends', 'prend']], ['finir', ['finis', 'finis', 'finit']],
    ['manger', ['mange', 'manges', 'mange']], ['appeler', ['appelle', 'appelles', 'appelle']], ['se lever', ['lève', 'lèves', 'lève']],
    ['pouvoir', ['peux', 'peux', 'peut']], ['vouloir', ['veux', 'veux', 'veut']], ['ouvrir', ['ouvre', 'ouvres', 'ouvre']],
    ['payer', ['paie', 'paies', 'paie']], ['mettre', ['mets', 'mets', 'met']], ['connaître', ['connais', 'connais', 'connaît']],
    ['s\'asseoir', ['assieds', 'assieds', 'assied']], ['vivre', ['vis', 'vis', 'vit']], ['recevoir', ['reçois', 'reçois', 'reçoit']],
  ])('%s', (inf, want) => { expect(conj(inf)).toEqual(want); });

  test('impersonal verbs', () => {
    expect(build('il', P('pleuvoir'), 'pr')).toBe('Il pleut.');
    expect(build('il', P('falloir'), 'pr', { obj: false })).toBe('Il faut.');
  });

  test('sentences, reflexives, elision and adverbs', () => {
    const v = withEx(P('manger'), 0);
    expect(build('tu', v, 'pr', { obj: false })).toBe('Tu manges.');
    expect(build('je', P('aimer'), 'pr', { obj: false })).toBe("J'aime.");
    expect(build('tu', P('se lever'), 'pr', { obj: false })).toBe('Tu te lèves.');
    expect(build('on', P('se lever'), 'pr', { obj: false, sentence: false, noSubj: 1 })).toBe('se lève');
    const souvent = ADVERBS.find(a => a.fr === 'souvent')!;
    expect(build('on', P('manger'), 'pr', { obj: false, adv: souvent })).toBe('On mange souvent.');
    // same as the old je-only sentence
    for (const b of VERBS) for (let i = 0; i < b.ex.length; i++) {
      const x = withEx(b, i);
      expect(build(subjFor(x)[0] === 'il' ? 'il' : 'je', x, 'pr')).toBe(presFr(x));
    }
  });

  test('negative', () => {
    expect(buildNeg('tu', P('finir'), 'pr', { obj: false })).toBe('Tu ne finis pas.');
    expect(buildNeg('on', P('se lever'), 'pr', { obj: false })).toBe('On ne se lève pas.');
    expect(acceptedNeg('tu', P('aimer'), 'pr').map(s => s.replace(/ .*$/, ''))).toContain('Tu');
    expect(check('tu aimes pas ce film', acceptedNeg('tu', withEx(P('aimer'), 0), 'pr'))).not.toBe('ng');
  });

  test('every verb × example × subject builds a clean sentence with Japanese', () => {
    const bad: string[] = [];
    for (const b of VERBS) for (let i = 0; i < b.ex.length; i++) {
      const v = withEx(b, i);
      for (const s of subjFor(v)) {
        const fr = build(s, v, 'pr'), ja = jaOf(s, v, 'pr');
        if (!/^[A-ZÀ-Ý].*\.$/.test(fr) || / {2}/.test(fr) || !ja.endsWith('。') || accepted(s, v, 'pr')[0] !== fr) bad.push(`${v.key} ${s}: ${fr} / ${ja}`);
        if (jaNegOf(s, v, 'pr') === '') bad.push(`${v.key} ${s}: empty neg`);
      }
    }
    expect(bad).toEqual([]);
    expect(V['manger']).toBeTruthy();
  });
});
