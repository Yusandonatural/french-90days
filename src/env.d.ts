/// <reference types="vite/client" />

declare module '*.tsv' {
  const rows: Record<string, string>[];
  export default rows;
}
declare module '*.txt?themes' {
  const themes: import('./data/parse').ThemeRow[];
  export default themes;
}

interface Window {
  trackConversion?: (name: string, params?: Record<string, unknown>) => void;
}
