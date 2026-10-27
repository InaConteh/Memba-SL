/** Amounts are stored as integer minor units: NLe 1 = 100. Never use floats for money. */
export function parseLeones(input: string): number {
  const s = input.trim().replace(/^(NLe|SLE|Le)\s*/i, '').replace(/[,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw new Error(`Invalid amount: "${input}"`);
  const [whole, frac = ''] = s.split('.');
  const minor = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  if (!Number.isSafeInteger(minor) || minor <= 0) throw new Error(`Invalid amount: "${input}"`);
  return minor;
}

export function formatLeones(minor: number): string {
  if (!Number.isSafeInteger(minor)) throw new Error('Amount must be an integer in minor units');
  const sign = minor < 0 ? '-' : '';
  const abs = Math.abs(minor);
  const whole = Math.floor(abs / 100).toLocaleString('en-US');
  const cents = abs % 100;
  return `${sign}NLe ${whole}${cents ? '.' + String(cents).padStart(2, '0') : ''}`;
}
