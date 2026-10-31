import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { SignInSchema } from '@/lib/schemas';
import { parseBusinessArgs } from '../../scripts/lib/business-args';
import { DEFAULT_TEMPLATES } from '../../scripts/lib/default-templates';

describe('sign-in form', () => {
  test('accepts an email and password, trimming the email', () => {
    expect(SignInSchema.parse({ email: '  owner@example.test ', password: 'x' }))
      .toEqual({ email: 'owner@example.test', password: 'x' });
  });

  test('rejects a malformed email with a readable message', () => {
    const result = SignInSchema.safeParse({ email: 'owner@', password: 'x' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Enter a valid email address.');
  });

  test('rejects an empty password', () => {
    const result = SignInSchema.safeParse({ email: 'owner@example.test', password: '' });
    expect(result.error?.issues[0].message).toBe('Enter your password.');
  });
});

describe('create-business arguments', () => {
  const base = ['--name', 'Test School', '--segment', 'school', '--email', 'Owner@Example.test'];

  test('parses required arguments and lowercases the email', () => {
    expect(parseBusinessArgs(base)).toEqual({
      name: 'Test School', segment: 'school', email: 'owner@example.test', phone: null, payInstructions: undefined,
    });
  });

  test('normalises the business phone to E.164', () => {
    expect(parseBusinessArgs([...base, '--phone', '076 123456']).phone).toBe('+23276123456');
  });

  test('keeps pay instructions', () => {
    expect(parseBusinessArgs([...base, '--pay-instructions', 'Orange Money 000000']).payInstructions)
      .toBe('Orange Money 000000');
  });

  test.each([
    [['--name', 'X', '--segment', 'bakery', '--email', 'a@b.test'], 'segment'],
    [['--name', 'X', '--segment', 'school', '--email', 'not-an-email'], 'email'],
    [[...base, '--phone', '+44 7911 123456'], 'phone'],
    [['--segment', 'school', '--email', 'a@b.test'], 'name'],
  ])('rejects bad input %#', (argv, field) => {
    expect(() => parseBusinessArgs(argv)).toThrow(new RegExp(`- ${field}:`));
  });

  test('rejects unknown options', () => {
    expect(() => parseBusinessArgs([...base, '--admin'])).toThrow();
  });
});

describe('default templates', () => {
  test('match the bodies in supabase/seed.sql', () => {
    const seed = readFileSync('supabase/seed.sql', 'utf8');
    for (const { body } of DEFAULT_TEMPLATES) expect(seed).toContain(body);
  });

  test('all end with the payment reference line', () => {
    for (const { body } of DEFAULT_TEMPLATES) {
      expect(body.endsWith('Please use reference {reference} when you pay.')).toBe(true);
    }
  });
});
