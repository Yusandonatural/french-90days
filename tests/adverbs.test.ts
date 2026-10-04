// Adverbs in every example: placement, negation and Japanese.
import { describe, expect, test } from 'vitest';
import { V, VERBS, withEx, type VerbEx } from '../src/data';
import { ADVERBS, advCandidates, type Adverb, type AdvForm } from '../src/grammar/adverbs';
import { accepted, acceptedNeg, allowed, build, buildNeg, check, colloq, presFr, subj0, type FormKey, type Subj } from '../src/grammar/conjugate';
import { jaNegOf, jaOf, presJa } from '../src/grammar/ja';

const adv = (fr: string, pos?: string): Adverb => ADVERBS.find(a => a.fr === fr && (!pos || a.pos === pos))!;
const verb = (key: string, obj = ''): VerbEx => Object.assign(withEx(V[key], 0), { obj });
const F: Record<AdvForm, FormKey | 'pr'> = { p: 'pc', v: 'vd', a: 'al', r: 'pr' };

describe('adverb list', () => {
  test('about 100 adverbs, every entry usable', () => {
    const words = new Set(ADVERBS.map(a => a.fr));
    expect(words.size).toBeGreaterThanOrEqual(100);
    for (const a of ADVERBS) {
      expect(a.forms.length).toBeGreaterThan(0);
      for (const f of a.forms) expect(a.ja[f], `${a.fr} ${f}`).toBeTruthy();
    }
    expect(words.has('absolument')).toBe(true);
  });
  test('every mid adverb with a negative partner points to a real negative entry', () => {
    for (const a of ADVERBS.filter(x => x.pos === 'mid')) if (a.neg) expect(a.neg.pos).toBe('neg');
    expect(adv('déjà').neg!.fr).toBe('pas encore');
  });
  test('every form and subject has adverbs to choose from', () => {
    for (const f of ['p', 'v', 'a', 'r'] as AdvForm[]) for (const s of ['je', 'on', 'tu', 'il']) {
      expect(advCandidates(f, { subj: s }).length).toBeGreaterThan(10);
      if (f !== 'v') expect(advCandidates(f, { subj: s, neg: true }).length).toBeGreaterThan(10);
    }
  });
});

describe('placement', () => {
  test.each([
    ['déjà', 'pc', "J'ai déjà fini."],
    ['enfin', 'vd', 'Je viens enfin de finir.'],
    ['juste', 'vd', "Je viens juste d'arriver."],
    ['vraiment', 'al', 'Je vais vraiment finir.'],
    ['heureusement', 'pc', "Heureusement, j'ai fini."],
    ['tout de suite', 'al', 'Je vais finir tout de suite.'],
  ])('%s + %s', (a, f, out) => {
    const v = verb(a === 'juste' ? 'arriver' : 'finir');
    expect(build('je', v, f as FormKey, { adv: adv(a) })).toBe(out);
  });
  test('reflexive and être verbs', () => {
    expect(build('je', verb('se lever'), 'pc', { adv: adv('déjà') })).toBe('Je me suis déjà levé.');
    expect(build('je', verb('se lever'), 'al', { adv: adv('enfin') })).toBe('Je vais enfin me lever.');
    expect(build('on', verb('partir', 'en vacances'), 'pc', { adv: adv('ensemble') })).toBe('On est parti en vacances ensemble.');
  });
  test('present', () => {
    expect(presFr(verb('être', 'en retard'), adv('souvent'))).toBe('Je suis souvent en retard.');
    expect(presFr(verb('se lever'), adv('toujours'))).toBe('Je me lève toujours.');
  });
  test('start and end adverbs are accepted in either place, commas optional', () => {
    const acc = accepted('je', verb('finir'), 'pc', { adv: adv('heureusement') });
    expect(check("j'ai fini heureusement", acc)).toBe('ok');
    expect(check("heureusement j'ai fini", acc)).toBe('ok');
    expect(check("j'ai heureusement fini", acc)).toBe('ng');
  });
});

describe('negation', () => {
  test('mid adverbs switch to their negative partner', () => {
    expect(buildNeg('je', verb('finir'), 'pc', { adv: adv('déjà') })).toBe("Je n'ai pas encore fini.");
    expect(buildNeg('je', verb('dormir'), 'pc', { adv: adv('bien') })).toBe("Je n'ai pas bien dormi.");
    expect(buildNeg('je', verb('partir'), 'al', { adv: adv('absolument') })).toBe('Je ne vais absolument pas partir.');
  });
  test('jamais / plus replace pas; non plus goes at the end', () => {
    expect(buildNeg('je', verb('partir'), 'al', { adv: adv('jamais') })).toBe('Je ne vais jamais partir.');
    expect(buildNeg('je', verb('être', 'en retard'), 'pr', { adv: adv('plus') })).toBe('Je ne suis plus en retard.');
    expect(buildNeg('je', verb('finir'), 'pc', { adv: adv('pas … non plus') })).toBe("Je n'ai pas fini non plus.");
  });
  test('spoken style without ne is still accepted', () => {
    const acc = acceptedNeg('je', verb('finir'), 'pc', adv('pas encore'));
    expect(check("j'ai pas encore fini", acc)).toBe('ok');
    expect(colloq('Je ne vais jamais partir.')).toBe('Je vais jamais partir.');
  });
});

describe('Japanese', () => {
  test('adverb goes before the predicate', () => {
    expect(jaOf('je', verb('finir'), 'pc', undefined, adv('déjà'))).toBe('私はもう' + V.finir.ta + '。');
    expect(jaOf('je', verb('finir'), 'pc', undefined, adv('heureusement'))).toBe('幸い、私は' + V.finir.ta + '。');
    expect(jaOf('je', verb('finir'), 'pc', undefined, adv('aussi'))).toBe('私も' + V.finir.ta + '。');
  });
  test('pas encore → まだ〜ていない', () => {
    expect(jaNegOf('je', Object.assign(verb('manger'), { ru: '食べる', ta: '食べた' }), 'pc', adv('déjà'))).toBe('私はまだ食べていない。');
  });
  test('jamais: 一度も (past) / 決して (future)', () => {
    const v = Object.assign(verb('manger'), { ru: '食べる', ta: '食べた' });
    expect(jaNegOf('je', v, 'pc', adv('jamais'))).toBe('私は一度も食べなかった。');
    expect(jaNegOf('je', v, 'al', adv('jamais'))).toBe('私はこれから決して食べない。');
  });
});

describe('every verb, example, form and adverb', () => {
  test('sentences are well formed and contain the adverb', () => {
    let n = 0;
    const errors: string[] = [];
    for (const base of VERBS) for (let i = 0; i < base.ex.length; i++) {
      const v = withEx(base, i);
      const subs: Subj[] = (v.I || v.T) ? ['il'] : ['je', 'on'];
      for (const s of subs) for (const a of ADVERBS) {
        if (a.on && s !== 'on') continue;
        for (const f of a.forms) {
          let fr: string, ja: string | null;
          if (a.pos === 'neg') {
            if (f === 'v') continue;
            const g = f === 'r' ? 'pr' : F[f] as 'pc' | 'al';
            if (g === 'pr' && s !== subj0(v)) continue;
            fr = buildNeg(s, v, g, { adv: a });
            ja = g === 'pr' ? 'skip' : jaNegOf(s, v, g, a);
          } else if (f === 'r') {
            if (s !== subj0(v)) continue;
            fr = presFr(v, a); ja = presJa(v, a);
          } else {
            const g = F[f] as FormKey;
            if (!allowed(v).includes(g)) continue;
            fr = build(s, v, g, { adv: a }); ja = jaOf(s, v, g, undefined, a);
          }
          const word = a.fr.split(' … ').pop()!;
          const bad = !/^[A-ZÀ-Ý].*[.?!]$/.test(fr) || / {2}|\s[.,]/.test(fr) || !fr.toLowerCase().includes(word.toLowerCase())
            || (ja && ja !== 'skip' && !a.mo && !ja.includes(a.ja[f]));
          if (bad) errors.push(`${v.key} | ${a.fr} | ${f} | ${fr} | ${ja}`);
          n++;
        }
      }
    }
    expect(errors.slice(0, 20)).toEqual([]);
    expect(n).toBeGreaterThan(100000);
  }, 120000);
});
