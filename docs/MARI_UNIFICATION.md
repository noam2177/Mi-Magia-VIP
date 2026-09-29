# איחוד «מרי» (`mi-magia-vip`) + RSVP (דניאל ותומר)

**עודכן:** 2026-09-29 · «מרי» = הריפו הפרטי `noam2177/mi-magia-vip` (שוכפל ל-`Documents\GitHub\mi-magia-vip`).

## 1. סקירת mi-magia-vip

**מה זה:** SaaS רב-ארגוני לניהול אירועים (Lovable, Vite + React Router 6, Tailwind 3, Supabase, framer-motion). מיועד ל**מפעיל/מפיק שמנהל לקוחות רבים**.

| תחום | מה יש שם |
|------|----------|
| מודל נתונים | `organizations` + `organization_members` + `organization_settings`, `profiles` (referral_code, credits), `events`, `guests`, `vendors`, `social_campaigns`, `couple_notes`, `couple_tasks`, `user_roles` (admin/user), `has_role` / `is_org_member` |
| מסך מפעיל | `/dashboard`, `/customers`, `/guests`, `/analytics`, `/message-stats`, `/vendors`, `/super-admin`, `/org-dashboard`, `/settings`, `/new-event` (אשף) |
| הודעות | תבניות (הזמנה / תזכורת / ניווט / תודה), `message_queue`, `messaging_logs` (sent/delivered/read/failed/replied), `send-whatsapp`, `whatsapp-webhook` (Meta: סטטוסי מסירה + כפתורי אישור), `whatsapp-otp` |
| חיוב | `is_billable` לאורח שאישר, `billing_status` (pending/invoiced/paid) |
| הפניות | `redeem-referral` (מניעת הפניה עצמית, כפילות) |
| אורח | `/rsvp/:guestId` — מזהה UUID גלוי, אישור + `party_size` עד 20, קונפטי |
| שונות | ספקים, נגישות (toolbar + עמוד), תנאים/פרטיות |

**חולשות שנמצאו (לא לייבא):** קישור אורח לפי `guest_id` (ניתן לניחוש, בדיוק מה ש-RSVP תיקן עם טוקן 128-bit); `verify_token` נקרא מטבלה ללא הצלבת ארגון; אין בדיקות; landing חלש (טופס לידים שרק מפנה ל-`/auth`); `.env` נכנס ל-git; תרגום/קידוד עברית שבור בחלק מקבצי התבניות.

## 2. החלטת ארכיטקטורה

**לא ממזגים קוד** — שתי סביבות שונות (TanStack Start + Router 1 מול Vite + Router 6, Tailwind 4 מול 3, Supabase נפרד). מיזוג ישיר = שכתוב בלי ערך.

**חלוקת תפקידים:**

| שכבה | מערכת | למה |
|------|--------|-----|
| נחיתה + מחשבון + הרשמה (`/`, `/start`) | **RSVP** | כבר יש מחשבון מחיר חי, מסלול דמו, ביט, מייל למפעיל |
| סביבת מארגן ללקוח (`/w/:token`) | **RSVP** | גישה לפני תשלום, ללא סיסמה |
| חוויית אורח (`/e/:slug`) | **RSVP** | טוקנים, בדיקות, בוט דטרמיניסטי |
| **מערכת עובדת ללקוחות רשומים** (ארגונים, לקוחות, ספקים, סטטיסטיקת הודעות, super-admin) | **mi-magia-vip** | זה מה שכבר בנוי שם |
| גשר | `lead → organization` | ליד ששילם מקדמה ב-RSVP נפתח כ-`organization` + `event` ב-mi-magia (שלב G3) |

## 3. מה נלקח עכשיו (בוצע)

1. **תבניות הודעה לאורח** — `src/lib/domain/message-templates.ts` + 6 בדיקות: הזמנה / תזכורת / ניווט / תודה, בלי שורות ריקות/`undefined`, תאריך עברי (Asia/Jerusalem), קישור `wa.me` מקודד.
2. **אדמין RSVP** — כפתור WhatsApp הפך לתפריט 4 סוגי הודעה עם טקסט מוכן (קודם נפתח `wa.me` ריק). `message_sent` מסומן רק בהזמנה.
3. **תיקון ניתוב אורח** (מהסבב הקודם) — `/e/:slug/welcome`, מפתח localStorage לפי slug.

## 4. מה **לא** נלקח ולמה

- ייבוא טקסט/Excel — ב-RSVP כבר יש `import-parse.ts` מבוסס ומכוסה בטסטים.
- הפניות — ל-RSVP מודל משלו (50 ₪ מהיתרה); הקוד של מרי חלש יותר.
- Landing — של RSVP עדיף (מחשבון + דמו).
- `guest_id` בקישור — נשאר טוקן.

## 5. צעדים הבאים (ממוינים)

| # | צעד | מאיפה | הערה |
|---|-----|-------|------|
| G1 | route `/g/:token` — דף אורח אישי (`guestPath` קיים ואין route) ואז החלפת `rsvpUrl` באדמין לקישור אישי | RSVP | חוסם קישור אישי בהודעות |
| G1b | הפניית `party_size` מעבר ל-5 אחרי מקדמה | מרי (עד 20) | תואם לדמו מוגבל |
| G2 | `messaging_logs` (sent/delivered/read/failed/replied) + עדכון סטטוסים בוובהוק Meta | מרי | רק בפריסה; המעבדה לא שולחת WhatsApp |
| G2b | קונפטי בדף תודה למאשרים (`canvas-confetti`) | מרי | קוסמטי |
| G3 | גשר ליד→ארגון: יצירת `organization`+`event` ב-mi-magia כשמסומן `deposit_paid` | שניהם | דורש החלטה על Supabase יחיד או API |
| G4 | ספקים / משימות זוג / ציר זמן כטאב בסביבת המארגן | מרי | `vendors`, `couple_tasks` |
| G5 | Accessibility toolbar + עמודי תנאים/פרטיות | מרי | חובה חוקית לפני פרסום ציבורי |

## 6. החלטות שנדרשות ממך

1. Supabase אחד לשניהם או שניים עם גשר API? (המלצה: שניים; RSVP נשאר ליד + אורח).
2. מי הלקוח של mi-magia — אתה כמפעיל (לניהול לקוחות RSVP), או לקוחות קצה ישירות?
3. `.env` ב-`mi-magia-vip` נמצא ב-git פרטי — לסובב מפתחות לפני שיתוף הריפו.
