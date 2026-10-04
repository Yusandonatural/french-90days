// Loads reference/trois-formes.html (the original single-file app) in jsdom and
// exposes its internal functions, so the ported modules can be compared against it.
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const EXPOSE = [
  'VERBS', 'V', 'THEMES', 'WORDS', 'MEAN', 'PLANW', 'FRAMES', 'SUBJ',
  'build', 'buildNeg', 'accepted', 'acceptedNeg', 'jaOf', 'jaNegOf', 'jNeg', 'jNegPast',
  'presFr', 'presJa', 'presWord', 'negObj', 'colloq', 'check', 'norm', 'wordVerb', 'applyPrep', 'adjJa',
  'dayVerbs', 'dayWords', 'personal', 'focusCats', 'allowed', 'subjFor', 'notesOf', 'withEx',
];

export function loadReference() {
  let html = readFileSync(new URL('../reference/trois-formes.html', import.meta.url), 'utf8');
  const end = html.lastIndexOf('})();');
  html = html.slice(0, end)
    + `window.__ref={${EXPOSE.join(',')},setCourse:c=>{ST.course=c}};\n`
    + html.slice(end);
  const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'dangerously', pretendToBeVisual: false });
  const ref = (dom.window as any).__ref;
  if (!ref) throw new Error('reference app failed to start');
  return { ref, close: () => dom.window.close() };
}
