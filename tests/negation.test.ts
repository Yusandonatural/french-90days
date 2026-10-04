// Readable cases for negation, agreement and answer checking (spec §7.1).
import { describe, expect, test } from 'vitest';
import { V, withEx, type VerbEx } from '../src/data';
import { accepted, acceptedNeg, build, buildNeg, check, colloq, negObj } from '../src/grammar/conjugate';
import { jNeg, jNegPast } from '../src/grammar/ja';

const verb = (key: string, obj?: string): VerbEx => Object.assign(withEx(V[key], 0), obj === undefined ? {} : { obj });

describe('three forms', () => {
  test('elision and reflexives', () => {
    expect(build('je', verb('finir', ''), 'pc')).toBe("J'ai fini.");
    expect(build('je', verb('finir', ''), 'vd')).toBe('Je viens de finir.');
    expect(build('je', verb('arriver', ''), 'vd')).toBe("Je viens d'arriver.");
    expect(build('je', verb('se lever', ''), 'pc')).toBe('Je me suis levé.');
    expect(build('je', verb('se lever', ''), 'vd')).toBe('Je viens de me lever.');
    expect(build('je', verb("s'asseoir", ''), 'vd')).toBe("Je viens de m'asseoir.");
    expect(build('je', verb('se lever', ''), 'al')).toBe('Je vais me lever.');
  });
  test('être agreement, every variant accepted', () => {
    expect(build('elle', verb('aller', 'au marché'), 'pc')).toBe('Elle est allée au marché.');
    expect(accepted('on', verb('aller', ''), 'pc')).toEqual(['On est allé.', 'On est allés.', 'On est allée.', 'On est allées.']);
    // a participle ending in s gets no extra plural s
    expect(build('nous', verb("s'asseoir", ''), 'pc')).toBe('Nous nous sommes assis.');
  });
});

describe('negation', () => {
  test('ne … pas around the auxiliary', () => {
    expect(buildNeg('je', verb('finir', ''), 'pc')).toBe("Je n'ai pas fini.");
    expect(buildNeg('je', verb('finir', ''), 'al')).toBe('Je ne vais pas finir.');
    expect(buildNeg('je', verb('finir', ''), 'pr')).toBe('Je ne finis pas.');
    expect(buildNeg('je', verb('se lever', ''), 'pc')).toBe('Je ne me suis pas levé.');
  });
  test('un / une / des / du / de la / de l\' → de / d\'', () => {
    const acheter = V.acheter;
    expect(negObj(acheter, 'du pain')).toBe('de pain');
    expect(negObj(acheter, 'de la viande')).toBe('de viande');
    expect(negObj(acheter, "de l'eau")).toBe("d'eau");
    expect(negObj(acheter, 'une orange')).toBe("d'orange");
    expect(negObj(acheter, 'des fleurs')).toBe('de fleurs');
    expect(negObj(acheter, 'le journal')).toBe('le journal');
    expect(buildNeg('je', verb('acheter', 'du pain'), 'pc')).toBe("Je n'ai pas acheté de pain.");
  });
  test('kept after prepositional de and fixed expressions', () => {
    expect(negObj(V['rêver'], 'de vacances')).toBe('de vacances');
    expect(negObj(V.parler, 'des vacances')).toBe('des vacances');
    expect(negObj(V.attendre, 'une heure')).toBe('une heure');
    expect(negObj(V.manger, 'un peu')).toBe('un peu');
  });
  test('spoken style without ne is accepted', () => {
    expect(colloq("J'ai pas fini.")).toBe("J'ai pas fini.");
    expect(colloq('Je ne vais pas finir.')).toBe('Je vais pas finir.');
    expect(colloq("Je n'ai pas fini.")).toBe("J'ai pas fini.");
    const acc = acceptedNeg('je', verb('finir', ''), 'pc');
    expect(check("j'ai pas fini", acc)).toBe('ok');
    expect(check("Je n’ai pas fini !", acc)).toBe('ok');
  });
});

describe('answer checking', () => {
  test('normalises case, apostrophes, punctuation and spaces', () => {
    expect(check("  J ' ai   FINI. ", ["J'ai fini."])).toBe('ok');
    expect(check('', ["J'ai fini."])).toBe('empty');
    expect(check('je suis alle', ['Je suis allé.'])).toBe('accent');
    expect(check('je vais finir', ["J'ai fini."])).toBe('ng');
  });
});

describe('Japanese negation', () => {
  test.each([
    ['食べる', '食べた', '食べない', '食べなかった'],
    ['帰る', '帰った', '帰らない', '帰らなかった'],
    ['買い物をする', '買い物をした', '買い物をしない', '買い物をしなかった'],
    ['来る', '来た', '来ない', '来なかった'],
    ['待つ', '待った', '待たない', '待たなかった'],
    ['病気になる', '病気だった', '病気にならない', '病気ではなかった'],
    ['とても忙しい', 'とても忙しかった', 'とても忙しくない', 'とても忙しくなかった'],
    ['家にいる', '家にいた', '家にいない', '家にいなかった'],
  ])('%s / %s', (ru, ta, neg, negPast) => {
    expect(jNeg(ru, ta)).toBe(neg);
    expect(jNegPast(ta, ru)).toBe(negPast);
  });
  test('returns null when it cannot convert', () => {
    expect(jNeg('行かなければならない', '')).toBeNull();
  });
});
