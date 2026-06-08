## מה משנים

### 1. תמונות במלבן אנכי (פורטרט)
- **קולאז' רקע בדף הבית** (`src/routes/index.tsx`): שינוי האריחים מ-`aspect-square` ל-`aspect-[3/4]` כך שכל תמונה תוצג כמלבן אנכי. עדכון מבנה הגריד כך שיתאים לאריחים גבוהים יותר.
- **קרוסלה בתחתית דף הבית**: שינוי מ-`aspect-[16/9]` ל-`aspect-[3/4]` (מלבן אנכי). גם ה-placeholder כשאין תמונות.
- **תצוגת תמונות בלוח הניהול** (`admin.index.tsx`): שינוי תצוגת התמונות שהועלו מ-`aspect-square` ל-`aspect-[3/4]` כך שתואם למה שיופיע בפועל.
- ההעלאה לא משתנה — מקבלים כל תמונה ופשוט מציגים אותה בקרופ אנכי (`object-cover` / `bg-cover bg-center`).

### 2. הסרת שדה "ברכה קצרה" מחלון אישור ההגעה
ב-`src/routes/rsvp.tsx`:
- מסירים את שדה ה-Textarea של `blessing` משני הטאבים (אישור הגעה + הרשמה).
- מסירים את `blessing` מ-zod schemas, מ-defaults, ומה-payload שנשלח ל-DB (השדה ב-DB נשאר, פשוט תמיד `null` מהטופס).
- לא נוגעים בעמודת "ברכה" בלוח הניהול ובייצוא ל-Excel — מנהלים עדיין רואים ברכות ישנות אם קיימות.

### 3. עדכונים בזמן אמת (Realtime) — תיקון מקיף
**הבעיה:** דף ה-RSVP (`/rsvp`) טוען את שאלות ה-FAQ פעם אחת בלבד ולא מאזין לשינויים, לכן עריכת שאלות/טקסטים בלוח הניהול לא מופיעה למשתמש בלי רענון. בנוסף, ייתכן ש-Realtime על `site_settings` ו-`invitees` לא פעיל ברמת ה-publication.

**הפתרון:**
- **Migration**: הוספת `site_settings` ו-`invitees` ל-`supabase_realtime` publication ו-`REPLICA IDENTITY FULL` כדי להבטיח שאירועי עדכון יזרמו.
- **`src/routes/rsvp.tsx`**: הוספת מנוי realtime ל-`site_settings` (כמו שכבר קיים ב-`index.tsx`), כך שעריכות FAQ וטקסטים מתעדכנות מיד גם בחלון אישור ההגעה.
- **בדיקה כוללת** של שאר המסכים: לוח הניהול, דף הבית, חלון אישור הגעה — לוודא שכולם מאזינים נכון ל-`site_settings`/`invitees` ושמדדים, טבלת מוזמנים, רקעים, קרוסלה, ושאלות נפוצות מתרעננים בלי F5.

## פרטים טכניים

- Migration SQL:
  ```sql
  ALTER TABLE public.site_settings REPLICA IDENTITY FULL;
  ALTER TABLE public.invitees REPLICA IDENTITY FULL;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.invitees;
  ```
  (אם כבר הוספו — ה-`ADD TABLE` ייכשל בשקט עם DO block מגן).
- אין שינוי בסכמת DB, אין שינוי ב-auth, אין שינוי בקבצי integrations של Supabase.
- כל שאר הלוגיקה (שמירת CMS, WhatsApp, ייצוא, פרסר חכם) נשארת כפי שהיא.
