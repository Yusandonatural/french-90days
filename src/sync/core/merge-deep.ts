// Generic merge for progress saved as plain JSON — portable core.
// Works without knowing the app's data shape:
//   numbers           → larger value (counters only grow: 正解数, XP, 秒数 …)
//   [n, n] tallies    → larger value per position
//   true / false      → true if either is true (done flags)
//   objects           → merged key by key (union of keys)
//   strings, others   → from the side saved more recently (non-empty first)
// Keys listed in `newer` (settings such as goal or current stage) always come from
// the side saved more recently. A newer `epoch` (set when progress is reset) wins outright.
// Both sides should carry `updatedAt` (ms) — set it on every save.

export interface MergeOptions {
  /** keys (any depth) whose value comes from the side saved more recently */
  newer?: string[];
  /** keys (any depth) with their own rule: (value here, value there, here is newer) → merged */
  resolve?: Record<string, (x: unknown, y: unknown, xIsNewer: boolean) => unknown>;
}
type J = unknown;
const isObj = (x: J): x is Record<string, J> => !!x && typeof x === 'object' && !Array.isArray(x);

export function mergeDeep<T>(a: T, b: T, opts: MergeOptions = {}): T {
  const A = a as Record<string, J>, B = b as Record<string, J>;
  const ea = Number(A?.epoch || 0), eb = Number(B?.epoch || 0);
  if (ea !== eb) return ea > eb ? a : b;
  const aNewer = Number(A?.updatedAt || 0) >= Number(B?.updatedAt || 0);
  const newer = new Set(opts.newer || []);
  const rec = (x: J, y: J, key: string): J => {
    if (x === undefined) return y;
    if (y === undefined) return x;
    const [n, o] = aNewer ? [x, y] : [y, x];
    if (opts.resolve && Object.prototype.hasOwnProperty.call(opts.resolve, key)) return opts.resolve[key](x, y, aNewer);
    if (newer.has(key)) return n;
    if (typeof x === 'number' && typeof y === 'number') return Math.max(x, y);
    if (typeof x === 'boolean' && typeof y === 'boolean') return x || y;
    if (Array.isArray(x) && Array.isArray(y)) {
      if (x.length === y.length && x.every(v => typeof v === 'number') && y.every(v => typeof v === 'number')) return x.map((v, i) => Math.max(v as number, y[i] as number));
      return n;
    }
    if (isObj(x) && isObj(y)) {
      const out: Record<string, J> = {};
      for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) out[k] = rec(x[k], y[k], k);
      return out;
    }
    if (typeof n === 'string' && !n && o) return o;
    return n;
  };
  return rec(a, b, '') as T;
}

/** JSON with sorted keys, so equal data gives equal text whatever the key order */
export function canon(x: J): string {
  if (Array.isArray(x)) return '[' + x.map(canon).join(',') + ']';
  if (isObj(x)) return '{' + Object.keys(x).sort().filter(k => x[k] !== undefined).map(k => JSON.stringify(k) + ':' + canon(x[k])).join(',') + '}';
  return JSON.stringify(x);
}
/** same progress, ignoring updatedAt */
export const sameDeep = (a: J, b: J) => canon({ ...(a as object), updatedAt: 0 }) === canon({ ...(b as object), updatedAt: 0 });
