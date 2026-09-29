# סרטון דמו — «מי מגיע»

## תוכן

- **Storyboard:** `DEMO_VIDEO_STORYBOARD.json` — 5 סצנות (נחיתה → הרשמה → סביבת עבודה → RSVP אורח → מענה חי).
- **ייצור:** `scripts/generate_demo_video_zai.py` — CogVideoX-3 דרך Z.AI (`/paas/v4/videos/generations` + polling).
- **תכנון GLM:** `scripts/mi_magia_demo_video_plan.py` — מעדכן את ה-JSON דרך `glm-5.3-flash` (כשמכסת Hub פנויה).

## באתר

- קובץ: `public/demo.mp4`
- רכיב: `src/components/marketing/DemoVideoSection.tsx` — `DEMO_VIDEO_SRC="/demo.mp4"`
- מופיע ב-`/` וב-`/demo`

## פריסה

1. `git push` ל-`noam2177/Mi-Magia-VIP`
2. סנכרון / Publish ב-Webflow או Lovable (לפי הסביבה שלך)
3. אופציונלי: poster `public/demo-poster.jpg` (פריים ראשון מה-MP4)

## הערה

סרטון AI הוא motion graphics כללי לפי הסטורiboard, לא הקלטת מסך של ה-UI. להדגמה pixel-perfect של הממשק — screen capture + עריכה קצרה.
