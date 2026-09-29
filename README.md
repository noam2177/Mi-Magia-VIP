# מי מגיע (Mi-Magia-VIP) — הזמנות ואישורי הגעה לחתונות ואירועים

מארגנים צריכים רשימת אורחים חיה ואחוז מענה, לא גיליון WhatsApp.

**הבסיס:** גרסת החתונה של דניאל ותומר שעבדה בשטח (`main`, תג `wedding-v1`). **שכבת המוצר** (הרשמה, מחשבון, סביבת מארגן, בדיקות) — ענף `product-v2`. **תוכנית האיחוד:** `docs/MASTER_PLAN.md`. הגרסה הישנה מ-Lovable: `noam2177/mi-magia-vip-legacy` (קריאה בלבד).

דף אורח עם טוקן (לא `guest_id=123`). פאנל ניהול עם מגיעים / לא מגיעים / ללא מענה / **אחוז מענה**. בוט WhatsApp דטרמיניסטי (`1`/`2` + מספר אורחים) — בלי LLM בזמן ריצה.

## דמו

- Preview (Lovable): https://id-preview-858eeb8c--b1c11060-9138-411d-bbab-f31371ea8580.lovable.app
- GitHub: https://github.com/noam2177/Mi-Magia-VIP

## סטאק (ולמה)

| שכבה | כלי | למה |
| --- | --- | --- |
| UI | TanStack Start + Vite | מוצר Lovable, דף אורח + אדמין |
| נתונים | Supabase | אורחים + הגדרות אתר |
| דומיין | TypeScript ב-`src/lib/domain` | טסטים בלי לדבר ל-WhatsApp מהמעבדה |
| בוט | מכונת מצבים | ADR: 0 LLM בריצה; HMAC על webhook |

## תוצאה שנמדדת במעבדה

`npm test` — vitest על טלפון ישראלי, טוקן אורח, ייבוא עברית, מטריקות כולל אחוז מענה.

## הרצה

```text
npm install
npm test
```

מפתחות רק ב-`.env` (לא ב-git). ראו `.env.example`.

## מגבלות

- המעבדה לא שולחת WhatsApp (Meta Cloud בפריסה בלבד).
- RLS ב-Supabase עדיין להחלה ידנית בענן.
- אין multi-tenant עד Gate E2.
- נתוני אורחים בפיתוח: סינתטיים.

## השקה

**מדריך מלא:** `docs/LAUNCH.md` · `npm run prelaunch` לפני Publish.

## הרשמה ציבורית (2026-09)

- נחיתה `/`, הרשמה `/start`, סביבת מארגן `/w/:token` (גישה לפני תשלום, עד 5 הזמנות דמו).
- חוויית אורח: `/e/:slug` (RSVP) → `/e/:slug/welcome` (פרטי אירוע). דמו: `/e/daniel-tomer`.
- איחוד עם פרויקט Lovable «מרי»: `docs/MARI_UNIFICATION.md` (ריפו מרי עדיין לא נראה ב-`noam2177` — צריך transfer או URL).
- מפרט: `docs/PRODUCT_ONBOARDING_SPEC.md`, מחירון: `docs/PRICING_FOUNDING_USERS.md`.
- מיגרציה: `supabase/migrations/20260929180000_onboarding_events_billing.sql`.
- אחרי הרשמה — מייל ל-`OPERATOR_NOTIFY_EMAIL` עם סכום לביט (Resend).
