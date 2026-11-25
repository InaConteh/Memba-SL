# App screens

Design file: [Memba — App Screens canvas](https://claude.ai/artifact/1SA623nosQKQksyeNczuva), 15 phone screens at 390 × 844. Most are clickable (press Play on *01 Welcome*).

The designs were made before this repo's pilot scope was set, so **this app and `docs/blueprint.md` win wherever they differ.** Treat the screens as direction for look and feel and as ideas for after the pilot, not as a spec.

## Differences to know about

| In the designs | In this app (follow this) |
| --- | --- |
| Amounts in "SLE" | `NLe` via `lib/money.ts` |
| "Debts" | Invoices with part-payments |
| Phone number + SMS code sign-in | Email + password, accounts created by script |
| Automatic reminders and SMS with the shop's name | Daily reminder queue; owner opens WhatsApp and confirms each one sent |
| Debtor replies "PLAN" by SMS | Not possible: two-way SMS isn't supported in Sierra Leone through messaging platforms ([source](https://sent.dm/resources/sl_sms_guidance)). Use a pay link or USSD option instead |
| Provision-shop examples (Mariama's Provisions) | Pilot segments are schools and wholesalers |
| Old mark (speech bubble with a tick) | New mark (bubble with an **m** and amber dot): see `docs/brand.md` |

## Screen by screen

| # | Screen | Status in this app | Notes |
| --- | --- | --- | --- |
| 01 | Welcome | Not built | Pilot accounts are created by script, so no public sign-up yet |
| 02–03 | Phone number, verify code | Not built | Phone OTP is a later change (blueprint: Supabase Send SMS hook) |
| 04 | Business setup | Script only | `scripts/create-business.ts` |
| 05 | Home: credit book | Built: `/customers` | Owed total, overdue and collected this month above the list; status pills; All / Overdue / Due soon / Nothing owed / Archived. `/dashboard` is still a placeholder |
| 06 | Add debt (5-second entry) | Partly: `/invoices/new` | Large amount field and due-date shortcuts are built. The keypad and recent-customer chips are ideas to test if owners find entry slow |
| 07 | Customer ledger | Built: `/customers/[id]` | Includes the progress bar, call button and one combined history. "Remind now" comes with `/today` |
| 08 | Record payment | Built: record-payment sheet (balance prefilled, method, reference) | Includes Full balance / Half and the line saying what will still be owed. No receipt message |
| 09 | Send reminder (tone choice) | Not built: `/today` is a placeholder; reminder rows are generated in the database | Each schedule step has a tone. Design shows the message preview and lets the owner switch tone per message |
| 10 | Home: empty state | Built: empty `/customers` | No phone-contacts picker |
| 11 | Debtor receives reminder | WhatsApp message | Pay link / USSD lines only if pay links ship (see `docs/payments-providers.md`) |
| 12 | Debtor payment page | Not built | Needs a payment provider. After the pilot |
| 13 | Reminders & automation | Not built | Schedule is per business (`{0,3,7}` by default). No settings UI in the pilot |
| 14 | Insights: money recovered | Not built: `/dashboard` is a placeholder | Blueprint plans owed, overdue, collected and paid after a reminder. "Days to get paid" is a candidate extra |
| 15 | Account & payments | Not built: `/settings` is a placeholder (sign out works) | Pilot plan and refund banner need billing, which is out of pilot scope |

## Ideas worth testing after the pilot

1. Lead the dashboard with **money recovered**, the number owners pay for.
2. A **"customer agreed to reminders"** tick when adding a customer. WhatsApp requires opt-in naming the business before automated, business-initiated messages ([source](https://developers.facebook.com/docs/whatsapp/overview/getting-opt-in)). It isn't needed while owners send by hand from their own phone.
3. **Pay in parts** offered inside the reminder.
4. Faster entry (keypad, recent customers) if pilot owners say adding invoices is slow.
