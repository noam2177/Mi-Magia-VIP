
# תכנית: אפליקציית RSVP "דניאל תומר אפטר חתונה!"

## סקירה
אפליקציית RSVP מלאה בעברית (RTL) בלבן ורוד בהיר, עם 3 מסכים: טופס אישור הגעה → דף נחיתה → פאנל ניהול מוגן.

## Backend (Lovable Cloud)

הפעלת Lovable Cloud + יצירת הסכמה:

**טבלת `invitees`:**
- `id` (uuid)
- `full_name` (text)
- `phone` (text, nullable)
- `status` ('attending' | 'not_attending' | null)
- `guests` (int, 1-5, default 1)
- `sleep` (bool)
- `blessing` (text)
- `message_sent` (bool, default false)
- `responded_at` (timestamptz)
- `created_at` (timestamptz)
- אילוץ: לפחות אחד מ-phone או full_name חייב להיות מלא
- RLS: anon יכול לקרוא לפי phone/name (לזיהוי) ולעדכן את עצמו; שירות בלבד לכל השאר

**טבלת `site_settings`** (שורה אחת):
- `main_text` (text)
- `navigation_url` (text) – Waze/Maps
- `collage_images` (jsonb array של URLs) – לרקע
- `carousel_images` (jsonb array של URLs) – לקרוסלה תחתית

**Storage bucket `event-images`** (ציבורי) – לתמונות רקע וקרוסלה.

**אבטחת אדמין:** כיוון שהמשתמש בחר שם פרטי + 123456 קשיח – נציג אזהרה ברורה בצ'אט שזו לא אבטחה אמיתית, ונשמור את הבדיקה client-side בלבד (יראה את הטבלה אבל כל פעולת כתיבה תרוץ דרך Lovable Cloud עם RLS – נשתמש ב-service role דרך server functions שמאמתות סיסמה בכל קריאה).

## Server Functions (createServerFn)
- `submitRsvp` – יוצר/מעדכן רשומה (זיהוי ב-phone או full_name, או יוצר חדשה אם לא קיים)
- `adminLogin` – מאמת שם+סיסמה, מחזיר session token פשוט (cookie)
- `adminListInvitees` / `adminUpsertInvitee` / `adminDeleteInvitee` / `adminBulkImport` / `adminParseText`
- `adminMarkMessageSent`
- `adminUpdateSettings` / `adminUploadImage` / `adminDeleteImage`

כל פונקציות האדמין דורשות את ה-session cookie ומאמתות אותו server-side.

## Frontend (TanStack Start)

### Routes
- `/` – RSVP Modal. אם אין cookie של `rsvp_done` → מציג מודאל חוסם. בהגשה: שומר cookie ומוביל ל-`/welcome`.
- `/welcome` – דף נחיתה. בדיקת cookie `rsvp_done`; אחרת redirect ל-`/`.
- `/admin/login` – טופס שם+סיסמה.
- `/admin` (תחת `_authenticated/`) – דשבורד אדמין.

### View 1 – RSVP Modal
- שדות: שם מלא, טלפון (לפחות אחד), סטטוס (מגיע/לא מגיע), אורחים 1-5 (תנאי), checkbox לינה, ברכה.
- ולידציה עם zod.
- כפתור שליחה → `submitRsvp` → cookie + redirect.

### View 2 – דף נחיתה
- **רקע קולאז'**: grid של `collage_images` (mosaic).
- טקסט מרכזי מתוך `main_text`.
- כפתור ניווט גדול לפי `navigation_url`.
- **קרוסלה תחתית**: רוטציה אוטומטית של `carousel_images` כל ~4 שניות.
- כפתור אדמין דיסקרטי בפינה (אייקון קטן).

### View 3 – דשבורד אדמין
- **כרטיסי מטריקות**: סה"כ, מגיעים, לא מגיעים, ללא מענה.
- **טבלה**: שם, טלפון, סטטוס, אורחים, לינה, ברכה, הודעה נשלחה. עם חיפוש, עריכה inline, מחיקה.
- **הוספה**: יחיד (מודאל), Bulk Import (Excel/CSV/TXT דרך SheetJS), Smart Parser (textarea שמזהה שורות עם שם/טלפון).
- **Export**: לקובץ CSV/XLSX.
- **WhatsApp**: אייקון בכל שורה → פותח `wa.me/<phone>` ב-tab חדש + מעדכן `message_sent=true` מיידית.
- **CMS**: העלאה/מחיקה של תמונות קולאז' וקרוסלה בנפרד, עריכת טקסט וכתובת ניווט.
- **Real-time**: Supabase realtime subscription על `invitees` → רענון אוטומטי.

## עיצוב
- צבעים: לבן (#FFFFFF) ורוד בהיר (גוונים בטוקני oklch ב-`src/styles.css`).
- פונט עברי (Heebo או Assistant מ-Google Fonts).
- `dir="rtl"` על ה-html ב-`__root.tsx`.
- shadcn/ui עם התאמות RTL.

## חבילות שיותקנו
- `xlsx` (SheetJS) – ייבוא/ייצוא Excel
- `papaparse` – CSV
- `date-fns` – פורמט תאריכים
- `zod`, `react-hook-form` – טפסים
- `embla-carousel-react` – קרוסלה
- אייקוני lucide-react (כבר קיים)

## הערות אבטחה שנציג למשתמש
1. הסיסמה "123456" וקשיחה בקוד = לא מאובטח. ניתן יהיה לראות אותה ב-DevTools של כל מבקר. מומלץ בהמשך לעבור ל-Lovable Cloud Auth אמיתי.
2. ה-RLS יתיר רק קריאת/יצירת רשומת RSVP עצמית; כל ניהול ירוץ דרך server functions שמאמתות session.

## סדר ביצוע
1. הפעלת Lovable Cloud + יצירת טבלאות + bucket + RLS.
2. עדכון styles.css (צבעים, RTL, פונט).
3. Server functions.
4. View 1 (Modal).
5. View 2 (Welcome + collage + carousel).
6. View 3 (Admin: login, table, metrics, CRUD, import/export, WhatsApp, CMS).
7. Realtime + QA.
