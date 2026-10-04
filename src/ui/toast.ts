import { $ } from '../util/dom';

let timer: ReturnType<typeof setTimeout> | undefined;
export function toast(m: string) {
  const t = $('#toast');
  t.textContent = m;
  t.hidden = false;
  clearTimeout(timer);
  timer = setTimeout(() => t.hidden = true, 2600);
}
