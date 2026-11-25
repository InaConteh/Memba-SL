# Payment providers for pay links: Monime vs Tenki Pay

Read from each provider's public docs on 20 November 2026. **Re-check before building**: APIs and terms change.

Pilot status (`docs/blueprint.md`): pay links are **not** in the pilot build. They come in behind a feature flag only if a sandbox spike works. This doc informs that decision.

## Recommendation

**Monime first, Tenki Pay as the fallback.** What matters most is how *customers* pay. Monime's payment codes work over USSD from Orange Money or Afrimoney on a basic phone. Tenki Pay's hosted checkout, as documented, is approved through the Tenki Pay app or web login.

| | Monime | Tenki Pay |
| --- | --- | --- |
| How payers pay | Hosted checkout; USSD/QR payment codes | Hosted checkout approved by Tenki Pay app QR or web login |
| Wallets mentioned | Launched with Orange Money and Afrimoney as partners ([2023 launch report](https://thecalabashnewspaper.com/?p=31792)) | Tenki Pay wallet, Orange Money, QMoney; Afrimoney not mentioned |
| Works on basic phones | Yes (USSD payment codes) | Not documented |
| Lock a code to one payer | `authorizedPhoneNumber` | — |
| Instalments | `recurrent` payment codes with a target count or total | Not in the API |
| Invoices with reconciliation | Track balances ourselves (we already do: `invoice_balances`) | `POST /invoices` with `amount_due` / `amount_paid` / `amount_outstanding` |
| Payouts | Bank and mobile money | Tenki Pay, Orange Money, QMoney, agent cash |
| Auth | Bearer token + `Monime-Space-Id` header | HMAC-SHA256 request signing |
| Amounts | Integer minor units (matches `lib/money.ts`) | Decimal strings (`"250.00"`): convert at the boundary |
| Fees | ~2% (stated at the 2023 launch; confirm) | Not published |

Docs: [Monime](https://docs.monime.io/) · [Tenki Pay developers](https://www.tenkipay.com/developers/docs)

## Questions to send before choosing

**Monime**
1. Which provider IDs are Orange Money and Afrimoney? The docs show `m17` and `m18` without names.
2. Current merchant fees, and can the fee be passed to the payer?
3. Can test mode simulate a payment-code payment end to end?

**Tenki Pay**
1. Can a customer pay a hosted checkout directly with Orange Money, without a Tenki Pay account?
2. Is Afrimoney planned?
3. Is there a webhook for invoice payments? The documented events were `checkout.payment_completed` and transfer events.

## Integration rules (either provider)

These follow `CLAUDE.md`.

- Secret keys live only on the server. Never in `src/` client code, and never in a `NEXT_PUBLIC_` variable.
- Verify webhook signatures against the **raw** body before parsing JSON (`await req.text()`). Reject old timestamps and compare in constant time.
- A redirect to a success URL is **not** proof of payment. Only a verified webhook, or the provider's verification endpoint, records a payment, and it goes through the same `payments` table and triggers as a hand-recorded payment.
- Store the provider's reference on the payment row, and make webhook handling idempotent: the provider may deliver the same event twice.
- Keep amounts as integer minor units. Convert to and from the provider's format at the edge only.
- Never hold customers' money: payments settle to the business's own account.

## Tenki Pay notes from the 20 Nov hackathon

A throwaway Next.js integration was built from the docs for the 20 Nov 2026 hackathon (not in this repo):

- Base URL `https://me.tenkipay.com/api/v1/merchant`. Sandbox and live are chosen by the key prefix.
- Requests are signed with HMAC-SHA256 over `{timestamp}\n{METHOD}\n{path}\n{raw body}`, with `X-TenkiPay-Key`, `X-TenkiPay-Timestamp` and `X-TenkiPay-Signature` headers. `Idempotency-Key` is required on creates.
- `POST /checkout/sessions` creates a session; `GET /checkout/sessions/{id}` verifies it. Only status `ACSC` means paid.
- Webhooks are signed `v1=<hex>` over `{unix ts}.{raw body}`, with a 5-minute tolerance.

It was not run against the live sandbox. Treat these notes as a starting point, not a tested reference.
