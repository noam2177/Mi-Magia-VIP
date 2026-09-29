# מחירון — יוזמים ראשונים (ניתן לעדכון)

המספרים בקוד: `src/lib/domain/pricing.ts` → `FOUNDING_RATE_CARD`.

## עקרונות (2026-09-29)

- **תמחור לפי מענה משוער** — לא לפי מספר שליחות/הזמנות.
- **מינימום התחייבות** — הלקוח מתחייב לסכום מינימום גם אם המענה בפועל נמוך (`minimumCommitmentIls`).
- **רף עלות + מרווח ביטחון** — הצעת מחיר לא יורדת מתחת ל־`max(מינימום, עלות פנימית × safetyMarginMultiplier)`.
- **דמו:** עד **5** הזמנות לפני מקדמה (לא מחויבות במענה).
- **מביא חבר:** **50 ₪** זיכוי כשחבר ששילם מקדמה.

> אחרי לקוחות ראשונים — אפשר לעבור לתמחור אחר; כרגע המודל מיועד למשוך פידבק בלי לרדת מתחת לעלות.

## טבלה (ברירת מחדל)

| פרמטר | ערך | הערה |
|--------|-----|------|
| `perResponseWhatsappIls` | 2.4 | למענה דרך WA |
| `perResponseEmailIls` | 1.2 | למענה דרך מייל |
| `perResponsePhoneIls` | 7 | למענה דרך טלפון |
| `expectedResponseRate` | 0.65 | 65% ממוזמנים → מענים לחיוב |
| `minimumCommitmentIls` | 399 | התחייבות מינימלית |
| `safetyMarginMultiplier` | 1.12 | מרווח מעל עלות פנימית |
| `depositIls` | 249 | מקדמה בביט |
| `foundingDiscountMultiplier` | 0.75 | הנחת יוזמים |

עלויות פנימיות (לרף בלבד): `costPerResponseWhatsappIls` 1.1, `costPerResponseEmailIls` 0.35, `costPerResponsePhoneIls` 4.2.

## נוסחה

```text
estimatedResponses = ceil(guests × expectedResponseRate)
usage = (platformFee + estimatedResponses × sum(perResponse channels)) × foundingDiscount
floor = max(minimumCommitmentIls, internalCost × safetyMargin)
totalProject = max(usage, floor)
```

בדיקות: `npm test` → `pricing.test.ts`.
