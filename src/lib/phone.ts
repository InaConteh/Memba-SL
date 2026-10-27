/** Normalises a Sierra Leone mobile number to E.164 (+232XXXXXXXX), or returns null. */
export function normalizeSLPhone(raw: string): string | null {
  let d = raw.replace(/[^\d+]/g, '');
  if (d.startsWith('+232')) d = d.slice(4);
  else if (d.startsWith('00232')) d = d.slice(5);
  else if (d.startsWith('232') && d.length === 11) d = d.slice(3);
  else if (d.startsWith('0')) d = d.slice(1);
  return /^\d{8}$/.test(d) ? `+232${d}` : null;
}
