/** Normalises a Sierra Leone mobile number to E.164 (+232XXXXXXXX), or returns null. */
export function normalizeSLPhone(raw: string): string | null {
  let d = raw.replace(/[^\d+]/g, '');
  if (d.startsWith('+232')) d = d.slice(4);
  else if (d.startsWith('00232')) d = d.slice(5);
  else if (d.startsWith('232') && d.length === 11) d = d.slice(3);
  else if (d.startsWith('0')) d = d.slice(1);
  return /^\d{8}$/.test(d) ? `+232${d}` : null;
}

/** '+23276123456' → '+232 76 123 456' for display; anything else is returned unchanged. */
export function formatSLPhone(e164: string): string {
  const m = e164.match(/^\+232(\d{2})(\d{3})(\d{3})$/);
  return m ? `+232 ${m[1]} ${m[2]} ${m[3]}` : e164;
}
