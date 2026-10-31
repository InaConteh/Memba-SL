import { parseArgs } from 'node:util';
import { z } from 'zod';
import { normalizeSLPhone } from '../../src/lib/phone';

export const USAGE = `Usage:
  npx tsx --env-file=.env.local scripts/create-business.ts \\
    --name "Business name" --segment school|wholesaler|property|agency|other \\
    --email owner@example.com [--phone 076123456] [--pay-instructions "Orange Money merchant code ..."]`;

const BusinessArgs = z.object({
  name: z.string().trim().min(1, 'name is required').max(120, 'name is too long'),
  segment: z.enum(['school', 'wholesaler', 'property', 'agency', 'other']),
  email: z.string().trim().toLowerCase().pipe(z.email('email is not valid')),
  phone: z
    .string()
    .optional()
    .transform((raw, ctx) => {
      if (raw === undefined) return null;
      const phone = normalizeSLPhone(raw);
      if (!phone) ctx.addIssue({ code: 'custom', message: `phone "${raw}" is not a Sierra Leone mobile number` });
      return phone;
    }),
  payInstructions: z.string().trim().max(300, 'pay instructions are too long').optional(),
});
export type BusinessArgs = z.infer<typeof BusinessArgs>;

/** Parses and validates the command line. Throws with a readable message on bad input. */
export function parseBusinessArgs(argv: string[]): BusinessArgs {
  const { values } = parseArgs({
    args: argv,
    strict: true,
    options: {
      name: { type: 'string' },
      segment: { type: 'string' },
      email: { type: 'string' },
      phone: { type: 'string' },
      'pay-instructions': { type: 'string' },
    },
  });
  const parsed = BusinessArgs.safeParse({ ...values, payInstructions: values['pay-instructions'] });
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  - ${i.path.join('.') || 'input'}: ${i.message}`);
    throw new Error(`Invalid arguments:\n${problems.join('\n')}\n\n${USAGE}`);
  }
  return parsed.data;
}
