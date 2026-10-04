// Tabs: home / drill / words / listen / speak, plus learn and conj (opened from inside).
import { $$ } from '../util/dom';

export type Tab = 'home' | 'drill' | 'words' | 'listen' | 'speak' | 'learn' | 'conj';
const handlers: Partial<Record<Tab, () => void>> = {};
/** What to render when a tab is shown. */
export function onShow(tab: Tab, fn: () => void) { handlers[tab] = fn; }

export function go(tab: Tab) {
  $$('nav.tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  $$('section.tab').forEach(s => s.classList.toggle('on', s.id === 't-' + tab));
  window.scrollTo(0, 0);
  handlers[tab]?.();
}
export const isShown = (tab: Tab) => document.getElementById('t-' + tab)!.classList.contains('on');

export function initRouter() {
  $$('nav.tabs button').forEach(b => b.onclick = () => go(b.dataset.tab as Tab));
  $$('[data-goto]').forEach(b => b.onclick = () => go(b.dataset.goto as Tab));
  document.addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLElement>('[data-go]');
    if (b) go(b.dataset.go as Tab);
  });
}
