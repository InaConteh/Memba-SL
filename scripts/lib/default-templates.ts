/**
 * Default English templates (blueprint section 5, plus change 1's reference
 * line). supabase/seed.sql carries the same text for local data.
 */
export const DEFAULT_TEMPLATES = [
  {
    tone: 'gentle',
    body: 'Good day {customer_name}. This is a friendly reminder from {business_name}: {amount} for {description} was due on {due_date}. {pay_instructions} Thank you. Please use reference {reference} when you pay.',
  },
  {
    tone: 'firm',
    body: 'Hello {customer_name}. {business_name} has not yet received {amount} for {description}, due on {due_date}. Please pay this week. {pay_instructions} If you have already paid, please reply so we can update our records. Please use reference {reference} when you pay.',
  },
  {
    tone: 'final',
    body: 'Dear {customer_name}, {amount} for {description} remains unpaid since {due_date}. Please pay or call {business_name} by the end of this week to agree a plan. {pay_instructions} Please use reference {reference} when you pay.',
  },
] as const;
