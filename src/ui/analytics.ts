// Conversion events (GA4 / Ads). window.trackConversion is defined in index.html
// and only sends on the production domain.
export const track = (n: string, p?: Record<string, unknown>) => {
  try { window.trackConversion && window.trackConversion(n, Object.assign({ site: 'french90' }, p || {})); } catch { /* ignore */ }
};
