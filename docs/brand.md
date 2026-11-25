# Memba brand guide

v1.0, November 2026. Full visual guide (11 pages): [Memba — Brand Identity canvas](https://claude.ai/artifact/Jgk39bxvffFTpKSEo3Fe2s).

## The idea

**We do the remembering, so you don't have to do the asking.**

The mark is a speech bubble holding a rounded lowercase **m**, with an **amber dot** at its corner.

- The bubble is a message, not a demand: polite, in writing, on the phone people already use.
- The **m** is for "memba", Krio for "remember". *Confirm this with native Krio speakers before printing anything.*
- The amber dot is the nudge: small and warm, never alarming. The gap around it keeps the reminder from crowding the relationship.

## Files

All master files are in `public/brand/`. The SVGs have the wordmark converted to outlines, so they need no fonts installed.

| Use | File |
| --- | --- |
| Default (web, documents) | `memba-logo-horizontal-primary.svg` |
| On Ink or Forest backgrounds | `memba-logo-horizontal-reverse.svg` |
| Square spaces (stickers, avatars) | `memba-logo-stacked-primary.svg` / `-reverse.svg` |
| One-colour print (receipts, stamps) | `memba-logo-horizontal-mono-ink.svg` / `-mono-white.svg` |
| Mark only (where "Memba" is already said nearby) | `memba-mark-*.svg` |
| Wordmark only | `memba-wordmark-ink.svg` / `-white.svg` / `-forest.svg` |
| App icon master | `memba-app-icon.svg` |

The app uses `src/app/icon.svg` and `favicon.ico` (browser tab), `src/app/apple-icon.png` (iOS home screen) and `public/icons/icon-192.png` / `icon-512.png` (web app manifest, `src/app/manifest.ts`). In code, use `<MembaMark />` and `<MembaLogo />` from `src/components/logo.tsx`.

## Rules

- **Clear space:** keep two amber dots' width of empty space on every side.
- **Minimum size:** logo 96 px / 25 mm wide; mark 20 px / 6 mm.
- **Don't** stretch, rotate, recolour, add effects, or put the primary logo on Forest (use the reverse version).

## Colour

Defined in `src/app/globals.css`. In UI code, prefer the semantic shadcn tokens (`bg-primary`, `text-muted-foreground`, …). The named brand colours (`bg-forest`, `text-nudge-deep`, …) are for brand moments.

| Name | Hex | Role | Tailwind |
| --- | --- | --- | --- |
| Forest | `#1E6B47` | Primary: buttons, active nav, brand | `primary`, `forest` |
| Forest Deep | `#14502F` | Hover / pressed | `forest-deep` |
| Forest Mist | `#E3F0E8` | Paid, success fills | `accent`, `forest-mist` |
| Ink | `#15211B` | Text, dark surfaces | `foreground`, `ink` |
| Paper | `#F6F4EE` | App background | `background`, `paper` |
| Stone | `#5B6660` | Secondary text | `muted-foreground`, `stone` |
| Sand | `#E4E0D6` | Lines, borders | `border`, `sand` |
| Amber (the nudge) | `#F2A33A` | The logo dot, highlights. **Never text** | `nudge` |
| Amber Deep | `#8A4A05` | Overdue text | `nudge-deep` |
| Amber Mist | `#FCEFD9` | Overdue fills | `nudge-mist` |

Accessible pairs: Ink on Paper 15:1 · white on Forest 6:1 · Stone on Paper 5.6:1 · Amber Deep on white 6.8:1.

Rough balance on a screen or poster: Paper 55% · Forest 25% · Ink 15% · Amber 5%.

## Type

| Role | Font | Weights | In the app |
| --- | --- | --- | --- |
| Headings, big numbers | Bricolage Grotesque | 600–800 | `font-heading`, applied to every `h1` |
| Everything people read | Inter | 400–700 | `font-sans` (default) |

Both are free (SIL Open Font License, see `src/app/fonts/OFL-*.txt`). They're self-hosted from `src/app/fonts/` as Latin-only subsets: about 41 KB and 45 KB, so they load quickly on 3G and the build needs no network.

## Voice

Memba sounds like the shop owner on their best day.

- **Warm, not soft.** Greet by name, say thank you, state the amount clearly.
- **Plain, not posh.** Short sentences, everyday words, one idea per message. Reads well aloud and on a basic phone.
- **Respectful, always.** Even a firm reminder protects dignity. No shaming, no threats, no capital-letter shouting.

| We say | We never say |
| --- | --- |
| "NLe 250 is still open on your account" | "FINAL WARNING" / "PAY NOW!!!" |
| "Pay any time" | "Failure to pay will result in…" |
| customer · balance · reminder | debtor · defaulter · debt collector |

Taglines: *Get back what you're owed.* · *We memba, so you don't have to ask.* · *Small reminders. Full shelves.*
