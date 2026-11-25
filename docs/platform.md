# Platform: why an installable web app

Decision, November 2026: **owners use Memba as a mobile web app they can add to their home screen. Customers never install anything.** A Play Store app comes later, wrapping the same code.

| Option | For | Against | Decision |
| --- | --- | --- | --- |
| Installable web app (current) | One codebase; shared by a WhatsApp link; no store review; updates reach everyone at once; small on data | Weaker offline and device features than native | **Now** |
| Native Android app | Play Store trust; best offline and device features | Weeks more work; store review on every update; a download barrier | After ~10 paying businesses: wrap this app (Trusted Web Activity or Capacitor) |
| WhatsApp bot | Owners already live in WhatsApp | Business messaging costs and template approval; poor for browsing a whole ledger | Later, as a quick way to add records |
| USSD for owners | Works on basic phones | Paid USSD gateway, short sessions, no lists | Only if pilots show owners lack smartphones |

**Rule of thumb:** the owner uses Memba every day, so an installed app is worth it to them. A customer pays occasionally, so they get a WhatsApp or SMS message and pay without installing anything.

## What's in place

- Web app manifest and icons (`src/app/manifest.ts`, `public/icons/`), so Chrome on Android offers "Add to Home Screen". Install it on each pilot owner's phone during setup.
- Built for 360 px Android on 3G (see `CLAUDE.md`).

## Not yet (out of pilot scope)

- **Offline mode.** If pilots show owners losing work on bad networks, add offline capture of payments and invoices with sync. It's the most valuable reason to go further than a plain web app.
- Push notifications.

**Ask every pilot owner:** "What phone do you use?" Ten answers will confirm or overturn this decision.
