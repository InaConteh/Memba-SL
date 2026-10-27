import { formatLeones } from './money';

export type TemplateVars = {
  customer_name: string;
  business_name: string;
  balance_minor: number;
  description: string;
  due_date: string;          // 'YYYY-MM-DD'
  pay_instructions?: string | null;
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

/** Replaces {placeholders}. Unknown placeholders throw, so a typo never reaches a customer. */
export function renderTemplate(body: string, v: TemplateVars): string {
  const values: Record<string, string> = {
    customer_name: v.customer_name.trim(),
    business_name: v.business_name.trim(),
    amount: formatLeones(v.balance_minor),
    description: v.description.trim(),
    due_date: formatDate(v.due_date),
    pay_instructions: v.pay_instructions?.trim() ?? '',
  };
  const out = body.replace(/\{(\w+)\}/g, (_, key: string) => {
    // Own keys only: `key in values` would accept {constructor}, {toString}, ...
    if (!Object.hasOwn(values, key)) throw new Error(`Unknown placeholder {${key}}`);
    return values[key];
  });
  return out.replace(/\n{3,}/g, '\n\n').trim();
}
