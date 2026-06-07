## הבעיה
האתר מנסה להקים את הסכמה דרך server function שמשתמש ב-`DATABASE_URL`/`SUPABASE_DB_URL` כדי להתחבר ישירות ל-Postgres. ההודעה האדומה מופיעה כי הקריאה האוטומטית לא הצליחה — וזה חוסם יצירת ה-bucket והעלאת תמונות.

האמת היא שלא צריך את המסלול הזה בכלל: יש לי כלי `supabase--migration` שמריץ SQL ישירות, ויש `supabase--storage_create_bucket` שיוצר את ה-bucket. אחרי שזה רץ, גם הטבלאות וגם ה-bucket יהיו קיימים, וההודעה האדומה תיעלם.

## תוכנית

1. **הרצת הסכמה** — להריץ את התוכן של `supabase/setup-all.sql` דרך `supabase--migration`. זה ייצור:
   - `public.invitees` (כולל כל העמודות והמדיניות)
   - `public.site_settings` (כולל שורת ברירת מחדל)
   - GRANTים + RLS policies
2. **יצירת bucket התמונות** — דרך `supabase--storage_create_bucket` (`event-images`, ציבורי). אז להריץ migration נוספת קצרה רק עבור ה-policies של `storage.objects` (read/insert/update/delete לכולם, מוגבל ל-`bucket_id='event-images'`).
3. **הסרת הבאנר האדום** — בקוד שבודק את `bootstrapDatabase`/חסר `DATABASE_URL`, להתייחס למצב שהטבלאות כבר קיימות כהצלחה שקטה (לא להציג שגיאה אדומה אם `runDatabaseSetup` החזיר `missing_db_url` אבל הטבלאות עובדות). שינוי מינימלי ב-admin dashboard בלבד.
4. **אימות** — לפתוח את `/admin`, להעלות תמונה לקולאז' ולקרוסלה, ולוודא שהיא נשמרת ומופיעה ב-`/welcome`.

## הערות טכניות
- לא צריך להוסיף secret `DATABASE_URL` — `supabase--migration` משתמש בערוץ מנוהל אחר.
- לא נוגעים ב-`client.ts`/`types.ts`/`.env`.
- אין שינוי עיצוב או לוגיקה אחרת.
