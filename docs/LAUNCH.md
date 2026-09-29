# תכנית השקה — RSVP (מחר)

השקה = **Publish ב-Lovable** + **Supabase מוכן** + **3 זרימות ירוקות**.

## מה חייב לעבוד (Definition of Done)

| # | זרימה | אימות |
|---|--------|--------|
| L1 | `/` נחיתה + מחשבון | נטען, ערוץ אחד לפחות, סכומים מוצגים |
| L2 | `/start` הרשמה | מקבלים קישור `/w/...` + `/thanks` |
| L3 | מייל למפעיל | `OPERATOR_NOTIFY_EMAIL` + `RESEND_API_KEY` |
| L4 | `/w/:token` סביבת עבודה | שיתוף, 5 הזמנות דמו (WA/מייל/טלפון) |
| L5 | `/e/daniel-tomer` דמו אורח | טופס RSVP |
| L6 | משוב | כפתור עגול → מייל למפעיל |
| L7 | `npm test` + `npm run build` | ירוק |

לא בשלב מחר (אחרי לקוחות): Hub `/rsvp-leads`, בוט WA Cloud, IVR מלא.

---

## הנדסה לאחור — סדר ביצוע

### שלב 0 — מקומי (היום, 15 דק׳)

```bash
cd C:\Users\noam1\Documents\GitHub\danielntomerafter-main
npm test
npm run build
npm run verify:launch
```

### שלב 1 — Supabase (20 דק׳)

1. Lovable Cloud → SQL Editor (או Supabase Dashboard).
2. להריץ **בסדר** את הקובץ: `supabase/LAUNCH_APPLY.sql` (מאחד את כל המיגרציות).
3. לוודא טבלאות: `onboarding_leads`, `events`, `customer_feedback`, `invitees`.

### שלב 2 — משתני סביבה (Lovable + מקומי)

ב-Lovable: **Project → Secrets / Environment** (ושרת):

| משתנה | חובה להשקה |
|--------|------------|
| `VITE_SUPABASE_URL` | כן |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | כן |
| `SUPABASE_URL` | כן (שרת) |
| `SUPABASE_SERVICE_ROLE_KEY` | כן (שרת — לעולם לא ב-VITE) |
| `OPERATOR_NOTIFY_EMAIL` | כן |
| `RESEND_API_KEY` | כן (מייל לידים + משוב) |
| `RESEND_FROM` | כן (דומיין מאומת ב-Resend) |
| `OPERATOR_BIT_LINK` | כן |
| `OPERATOR_BIT_PHONE` | מומלץ |
| `PUBLIC_SITE_URL` | כן אחרי Publish (כתובת הפרודקשן) |

העתק מ-`.env.example` ל-`.env` מקומי.

### שלב 3 — Git → Lovable (10 דק׳)

```bash
git add -A && git commit -m "..." && git push
```

ב-Lovable: סנכרון מ-GitHub (אם מחובר) או העלאה.

### שלב 4 — Publish (5 דק׳)

Lovable → **Share → Publish** → קבל URL ציבורי.

עדכן `PUBLIC_SITE_URL` לכתובת הפרודקשן.

### שלב 5 — סמוק טסט בפרודקשן (15 דק׳)

1. `/` → `/start` — הרשמה עם מייל אמיתי שלך.
2. בדוק מייל מפעיל (סכום ביט + קישור workspace).
3. פתח `/w/...` — שלח 1 הזמנה WA דמו.
4. כפתור משוב — בדוק מייל.
5. `/e/daniel-tomer` — RSVP.

---

## פקודות שימושיות

| פקודה | תפקיד |
|--------|--------|
| `npm run verify:launch` | בודק משתני סביבה נדרשים |
| `npm run prelaunch` | test + build + verify |
| `npm run dev` | פיתוח מקומי |

---

## תקלות נפוצות

| תסמין | פתרון |
|--------|--------|
| `workspace_not_found` | מיגרציה לא הוחלה או token שגוי |
| מייל לא מגיע | Resend domain / `RESEND_FROM` / spam |
| SSR 500 מקומי | בדוק `SUPABASE_*` ב-.env |
| Preview דורש login | השתמש ב-**Published** URL, לא Preview |

---

## אחרי השקה (שבוע 1)

- [ ] מסך Hub לידים + «סומן שולם בביט»
- [ ] `markDepositPaidWithReferral` מ-Hub
- [ ] דף אורח `/g/:token` אישי
- [ ] רישום במאגר portfolio (`register.py`)
