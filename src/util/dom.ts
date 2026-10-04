export const $ = <T extends HTMLElement = HTMLElement>(s: string): T => document.querySelector(s) as T;
export const $$ = <T extends HTMLElement = HTMLElement>(s: string): T[] => [...document.querySelectorAll<T>(s)];
export const esc = (s: unknown): string =>
  String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
export const rnd = <T>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
export const shuffle = <T>(a: readonly T[]): T[] => {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
};
export const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
/** Focus a button and bring it above the fixed tab bar (html has scroll-padding-bottom). */
export const focusInView = (el: HTMLElement) => { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'nearest' }); };
