"""Generate Mi-Magia demo MP4 via Z.AI CogVideoX-3 and save to public/demo.mp4."""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.request
from pathlib import Path

HUB = Path(__file__).resolve().parents[3] / "principal-architect-hub"
if str(HUB) not in sys.path:
    sys.path.insert(0, str(HUB))

from hub.glm_metered import load_env  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
STORYBOARD = ROOT / "docs" / "DEMO_VIDEO_STORYBOARD.json"
OUT_MP4 = ROOT / "public" / "demo.mp4"
BASE = os.environ.get("GLM_API_BASE", "https://api.z.ai/api/paas/v4").rstrip("/")


def _post(path: str, body: dict) -> dict:
    load_env()
    key = os.environ.get("ZAI_API_KEY", "").strip()
    if not key:
        raise SystemExit("ZAI_API_KEY missing — set in principal-architect-hub/.env")
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _get(path: str) -> dict:
    load_env()
    key = os.environ.get("ZAI_API_KEY", "").strip()
    req = urllib.request.Request(
        f"{BASE}{path}",
        headers={"Authorization": f"Bearer {key}"},
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


def load_prompt() -> str:
    if STORYBOARD.is_file():
        data = json.loads(STORYBOARD.read_text(encoding="utf-8"))
        master = (data.get("master_prompt_en") or "").strip()
        if master:
            return master
        scenes = data.get("scenes") or []
        parts = [s.get("visual_prompt_en", "") for s in scenes if s.get("visual_prompt_en")]
        return " Smooth transitions. ".join(parts)
    return (
        "Cinematic product demo, Israeli wedding RSVP app Mi-Magia, pink and rose UI, "
        "smartphone screens showing landing page, registration form, guest list, RSVP confirm, "
        "live stats dashboard, Hebrew RTL layout feel, modern SaaS motion graphics, 60 seconds."
    )


def poll_task(task_id: str, *, max_wait: int = 600) -> str:
    deadline = time.time() + max_wait
    while time.time() < deadline:
        result = _get(f"/async-result/{task_id}")
        status = (result.get("task_status") or result.get("status") or "").upper()
        print("poll", task_id, status)
        if status in {"SUCCESS", "SUCCEEDED"}:
            videos = result.get("video_result") or result.get("videos") or []
            if videos:
                url = videos[0].get("url") or videos[0].get("video_url")
                if url:
                    return url
            raise RuntimeError(f"SUCCESS but no url: {result}")
        if status in {"FAIL", "FAILED"}:
            raise RuntimeError(json.dumps(result, ensure_ascii=False))
        time.sleep(10)
    raise TimeoutError(task_id)


def download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=300) as resp:
        dest.write_bytes(resp.read())


def main() -> int:
    prompt = load_prompt()
    print("prompt chars:", len(prompt))
    submit = _post(
        "/videos/generations",
        {
            "model": "cogvideox-3",
            "prompt": prompt[:4000],
            "quality": "quality",
            "with_audio": True,
            "size": "1920x1080",
            "fps": 30,
        },
    )
    task_id = submit.get("id") or submit.get("task_id")
    if not task_id:
        print(json.dumps(submit, ensure_ascii=False, indent=2))
        return 1
    print("task_id", task_id)
    video_url = poll_task(str(task_id))
    print("video_url", video_url[:80], "...")
    download(video_url, OUT_MP4)
    print("saved", OUT_MP4, "bytes", OUT_MP4.stat().st_size)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
