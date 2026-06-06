export const SLEEP_OPTIONS = [
  { value: "tent_large", label: "נשאר לישון במתחם באוהל גדול ממוזג" },
  { value: "own_tent", label: "מביא אוהל מהבית" },
  { value: "nearby", label: "נשאר לישון בקרבת מקום ומגיע לארוחת בוקר" },
  { value: "no_sleep", label: "לא נשאר לישון" },
] as const;

export type SleepOption = (typeof SLEEP_OPTIONS)[number]["value"];

export function getSleepLabel(value: string | boolean | null | undefined): string {
  if (value === true) return "כן";
  if (value === false || value === null || value === undefined || value === "") return "לא נשאר לישון";
  const found = SLEEP_OPTIONS.find((o) => o.value === value || o.label === value);
  return found?.label ?? String(value);
}
