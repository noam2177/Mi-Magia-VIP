## מטרה
להחזיר את חוויית המשתמש שהייתה לפני "התיקון האבטחתי": התחברות מנהל לפי שם פרטי (נעם/דניאל/תומר) + סיסמה `123456`, RSVP אנונימי ישיר מול הדאטה־בייס, ולפתור את שגיאת ה-404 של הטבלאות.

**הבהרה**: זה מוריד את האבטחה. כל אחד עם קישור לדף `/admin/login` יוכל להיכנס עם השם והסיסמה. RLS ייפתח לקריאה/כתיבה אנונימית לטבלאות של האירוע. אישרת — ממשיך.

## שינויים

### 1. התחברות מנהל (UI + סשן)
- `src/lib/admin-session.ts` — להחזיר לגרסה הישנה: `sessionStorage` עם `ALLOWED_NAMES = ["נעם","דניאל","תומר"]` וסיסמה `"123456"`. פונקציות: `adminLogin(name, password)`, `adminLogout()`, `getAdminSession()`. ללא Supabase Auth.
- `src/routes/admin.login.tsx` — טופס פשוט עם שדה "שם" + "סיסמה" וכפתור "כניסה" (בלי מצב "יצירת מנהל ראשון", בלי אימייל, בלי `claimFirstAdmin`).
- `src/routes/admin.index.tsx` — לעדכן את בדיקת הכניסה מ־`getAdminUser()` (async) ל־`getAdminSession()` (sync), ולעדכן כפתור "התנתק".
- `src/components/admin-notifications-bell.tsx` — להחליף `getAdminUser` ב־`getAdminSession`, להשתמש בשם כמזהה לצורך "נקרא/לא נקרא".

### 2. פתיחת הדאטה בייס (תיקון 404)
מיגרציה חדשה שמחזירה גישה אנונימית לטבלאות של האפליקציה:
- `invitees`, `admin_notifications`, `site_settings` — `GRANT SELECT, INSERT, UPDATE, DELETE ... TO anon, authenticated`.
- מסירה את ה-policies המחמירות שדורשות `private.has_role(...)` ומחליפה ב-policy מתירני `USING (true) WITH CHECK (true)` לכל הפעולות (מאחר שאין auth אמיתי).
- `event-images` storage bucket — policies שמאפשרות `INSERT/SELECT/UPDATE/DELETE` ל-anon (או להפוך את ה־bucket לפומבי).

### 3. זרימת RSVP ישירות מול DB
- `src/lib/invitees-db.ts` / `src/routes/rsvp.tsx` — להחזיר לכתיבה ישירה עם `supabase.from("invitees").insert/update(...)` בלי לעבור דרך `submitRsvpPublic`.
- `src/lib/notifications.ts` — לחזור ל־`supabase.from("admin_notifications").insert(...)` ישיר.
- `src/lib/upload-event-image.ts` — העלאת תמונות ישירות דרך `supabase.storage` מהדפדפן, ללא server function.
- אפשר להשאיר את `src/lib/api/admin.functions.ts` כקובץ (הפונקציות פשוט לא ייקראו יותר), או למחוק אותו.

## פרטים טכניים
- לא נוגעים בקבצים מנוהלים אוטומטית: `src/integrations/supabase/*`.
- המיגרציה תריץ `DROP POLICY IF EXISTS` על כל ה-policies הקיימות בטבלאות הרלוונטיות לפני יצירת החדשות, כדי להימנע מכפילויות.
- ה-`user_roles` ופונקציית `private.has_role` יכולות להישאר בדאטה בייס — פשוט לא ייעשה בהן שימוש.
- אחרי המיגרציה, שגיאת ה-404 אמורה להיעלם כי `anon` יקבל שוב הרשאות + policies מתירים לו לקרוא.

## אזהרה
לאחר החזרה: הסיסמה `123456` והשמות המורשים יופיעו ב-bundle הצד־לקוח. כל אחד יכול לפתוח את הדאטה בייס דרך ה-API. אתה מאשר שזה מה שרצית.
