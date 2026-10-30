import { describe, expect, test } from 'vitest';
import { formatLeones, parseLeones } from '@/lib/money';
import { normalizeSLPhone } from '@/lib/phone';
import { renderTemplate, type TemplateVars } from '@/lib/templates';
import { whatsappLink } from '@/lib/whatsapp';

describe('money', () => {
  test('parses amounts with thousands separators and currency prefixes', () => {
    expect(parseLeones('1,500.5')).toBe(150050);
    expect(parseLeones('NLe 25.50')).toBe(2550);
  });

  test.each(['-5', '0', '1.234', '1e5'])('rejects invalid amount %s', (input) => {
    expect(() => parseLeones(input)).toThrow('Invalid amount');
  });

  test.each(['NLe 1,500.50', 'NLe 25', 'NLe 0.05', 'NLe 1,000,000'])(
    'round-trips %s through format and parse',
    (formatted) => {
      expect(formatLeones(parseLeones(formatted))).toBe(formatted);
    },
  );
});

describe('phone', () => {
  test.each(['076 123456', '+232 76 123456', '0023276123456', '23276123456', '76-123-456'])(
    'normalises %s to E.164',
    (raw) => {
      expect(normalizeSLPhone(raw)).toBe('+23276123456');
    },
  );

  test.each(['076 12345', '076 1234567', '+44 7911 123456', '07911 123456'])(
    'rejects wrong length or foreign number %s',
    (raw) => {
      expect(normalizeSLPhone(raw)).toBeNull();
    },
  );
});

describe('templates', () => {
  const vars: TemplateVars = {
    customer_name: 'Fatmata Kamara',
    business_name: 'Sunrise Academy',
    balance_minor: 150050,
    description: 'Term 1 fees',
    due_date: '2026-11-03',
    reference: 'M-0427',
    pay_instructions: 'Orange Money merchant code 000000',
  };

  test('fills known placeholders', () => {
    expect(renderTemplate('{customer_name}: {amount} for {description} due {due_date}. {pay_instructions}', vars))
      .toBe('Fatmata Kamara: NLe 1,500.50 for Term 1 fees due 3 Nov 2026. Orange Money merchant code 000000');
  });

  test('fills the payment reference', () => {
    expect(renderTemplate('{pay_instructions} Please use reference {reference} when you pay.', vars))
      .toBe('Orange Money merchant code 000000 Please use reference M-0427 when you pay.');
  });

  test('throws on an unknown placeholder', () => {
    expect(() => renderTemplate('Hello {customer}', vars)).toThrow('Unknown placeholder {customer}');
  });

  test.each(['constructor', 'toString', 'hasOwnProperty'])(
    'throws on built-in object property {%s}',
    (key) => {
      expect(() => renderTemplate(`Hello {${key}}`, vars)).toThrow(`Unknown placeholder {${key}}`);
    },
  );
});

describe('whatsapp', () => {
  test('encodes & and new lines in the message', () => {
    expect(whatsappLink('+23276123456', 'Fees & books\nThank you'))
      .toBe('https://wa.me/23276123456?text=Fees%20%26%20books%0AThank%20you');
  });

  test('rejects a phone that is not +232XXXXXXXX', () => {
    expect(() => whatsappLink('076123456', 'Hi')).toThrow('Phone must be +232XXXXXXXX');
  });
});
