"""One-off: GLM storyboard for Mi-Magia demo video. Run from principal-architect-hub venv/path."""
from __future__ import annotations

import json
import sys
from pathlib import Path

HUB = Path(__file__).resolve().parents[3] / "principal-architect-hub"
if str(HUB) not in sys.path:
    sys.path.insert(0, str(HUB))

from hub.glm_metered import complete  # noqa: E402

OUT = Path(__file__).resolve().parents[1] / "docs" / "DEMO_VIDEO_STORYBOARD.json"

SYSTEM = (
    "You are a product video director for Israeli wedding RSVP SaaS Mi-Magia-VIP (brand: מי מגיע). "
    "Output valid JSON only, no markdown."
)

USER = """
Create a 60-second product demo video plan for the full customer journey:
1) Landing + live price calculator
2) Registration at /start (personal vs business, event type)
3) Organizer workspace /w/:token — up to 5 demo invites (WhatsApp/email/phone)
4) Guest RSVP page /e/:slug (example wedding daniel-tomer)
5) Live response tracking for organizers

Requirements:
- 5 scenes, ~12 seconds each
- Hebrew on-screen titles (he_title)
- Short Hebrew voiceover lines (he_voiceover)
- English visual_prompt for CogVideoX-3 (UI-style motion graphics, pink/rose wedding tech aesthetic, RTL feel)
- ui_note: what real app screen this maps to

Return JSON object:
{
  "title": "...",
  "total_seconds": 60,
  "primary_model": "cogvideox-3",
  "fallback_model": "viduq1-text",
  "scenes": [
    {"id": 1, "duration_sec": 12, "he_title": "...", "he_voiceover": "...", "visual_prompt_en": "...", "ui_note": "..."}
  ],
  "master_prompt_en": "single combined prompt if we generate one clip instead of five",
  "audio_note": "..."
}
"""


def main() -> int:
    prompt = f"{SYSTEM}\n\n{USER}"
    r = complete(
        prompt,
        max_tokens=4096,
        purpose="mi_magia_demo_plan",
        experiment_id="mi_magia_video",
    )
    if not r.get("ok"):
        print(json.dumps(r, ensure_ascii=False, indent=2))
        return 1
    text = (r.get("content") or r.get("text") or "").strip()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        OUT.with_suffix(".raw.txt").write_text(text, encoding="utf-8")
        print("Wrote raw GLM output to", OUT.with_suffix(".raw.txt"))
        return 1
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Wrote", OUT)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
