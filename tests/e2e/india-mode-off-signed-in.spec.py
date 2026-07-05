"""
Signed-in end-to-end test: from the /india page, tapping "Continue in English"
must (a) clear the user's server-side chat history, (b) show the
"India Mode off" toast, and (c) land on the home UI in English (no `india`
class on <html>, seeded Gujarati bubble gone).

Requires a signed-in Supabase session (LOVABLE_BROWSER_AUTH_STATUS=injected).

    python3 tests/e2e/india-mode-off-signed-in.spec.py
"""

import asyncio
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen
from playwright.async_api import async_playwright, expect

BASE_URL = "http://localhost:8080"
SCREENSHOTS = Path("/tmp/browser/india-mode-off-signed-in")
SCREENSHOTS.mkdir(parents=True, exist_ok=True)

SETTINGS_KEY = "askeasy.settings.v4"
MESSAGES_KEY = "askeasy.messages.v1"

INDIA_SEED_SETTINGS = {
    "name": "Ravi",
    "theme": "dark",
    "voiceEnabled": True,
    "openRouterModel": "askeasy/smart",
    "isPro": False,
    "indiaMode": True,
    "language": "gu",
    "indiaOnboarded": True,
}


def seed_server_messages(access_token: str, user_id: str, supabase_url: str, publishable_key: str) -> int:
    """Insert two Gujarati messages via PostgREST as the signed-in user; return final row count."""
    rows = [
        {"user_id": user_id, "role": "user", "content": "કેમ છો", "attachments": []},
        {"user_id": user_id, "role": "assistant", "content": "મજામાં", "attachments": []},
    ]
    req = Request(
        f"{supabase_url}/rest/v1/messages",
        data=json.dumps(rows).encode(),
        method="POST",
        headers={
            "apikey": publishable_key,
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
    )
    with urlopen(req) as r:
        inserted = json.loads(r.read())
    return len(inserted)


def count_server_messages(access_token: str, user_id: str, supabase_url: str, publishable_key: str) -> int:
    req = Request(
        f"{supabase_url}/rest/v1/messages?select=id&user_id=eq.{user_id}",
        headers={
            "apikey": publishable_key,
            "Authorization": f"Bearer {access_token}",
            "Prefer": "count=exact",
        },
    )
    with urlopen(req) as r:
        rows = json.loads(r.read())
    return len(rows)


async def restore_session(page, context):
    storage_key = os.environ["LOVABLE_BROWSER_SUPABASE_STORAGE_KEY"]
    session_json = os.environ["LOVABLE_BROWSER_SUPABASE_SESSION_JSON"]
    cookies_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_COOKIES_JSON")
    if cookies_json:
        cookies = json.loads(cookies_json)
        for c in cookies:
            c["url"] = BASE_URL
        await context.add_cookies(cookies)
    await page.goto(BASE_URL, wait_until="domcontentloaded")
    await page.evaluate(
        f"window.localStorage.setItem({json.dumps(storage_key)}, {json.dumps(session_json)})"
    )


async def main():
    status = os.environ.get("LOVABLE_BROWSER_AUTH_STATUS", "")
    if status != "injected":
        raise SystemExit(
            f"LOVABLE_BROWSER_AUTH_STATUS={status!r}; please sign in via the Lovable preview and rerun."
        )

    access_token = os.environ["LOVABLE_BROWSER_SUPABASE_ACCESS_TOKEN"]
    session = json.loads(os.environ["LOVABLE_BROWSER_SUPABASE_SESSION_JSON"])
    user_id = session["user"]["id"]

    # Read Supabase URL / publishable key from the app's env so we hit the same project.
    env_file = Path(".env")
    env = {}
    for line in env_file.read_text().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    supabase_url = env["VITE_SUPABASE_URL"]
    publishable_key = env["VITE_SUPABASE_PUBLISHABLE_KEY"]

    # Seed 2 server-side messages for the signed-in user.
    inserted = seed_server_messages(access_token, user_id, supabase_url, publishable_key)
    assert inserted == 2, f"expected to insert 2 server messages, got {inserted}"

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        # Restore Supabase session BEFORE navigating to protected surfaces.
        await restore_session(page, context)

        # Seed India Mode on + a Gujarati draft, then land on /india.
        await page.evaluate(
            """([sk, s, mk]) => {
                localStorage.setItem(sk, JSON.stringify(s));
                localStorage.setItem(mk, JSON.stringify([
                    {id:'m1', role:'user', content:'કેમ છો', attachments:[], createdAt:1},
                    {id:'m2', role:'assistant', content:'મજામાં', attachments:[], createdAt:2},
                ]));
                localStorage.setItem('askeasy.draft.composer', 'kem cho');
                localStorage.setItem('askeasy.attachments.pending',
                    JSON.stringify([{id:'a', type:'image', dataUrl:'data:,', name:'x.png'}]));
                sessionStorage.setItem('askeasy.india.session', '1');
            }""",
            [SETTINGS_KEY, INDIA_SEED_SETTINGS, MESSAGES_KEY],
        )

        await page.goto(f"{BASE_URL}/india", wait_until="domcontentloaded")
        await page.wait_for_load_state("networkidle")
        await page.screenshot(path=str(SCREENSHOTS / "1_india_page.png"))

        # Sanity: server has 2 messages for this user.
        assert count_server_messages(access_token, user_id, supabase_url, publishable_key) >= 2, \
            "expected seeded server messages before toggle"

        # Click "Continue in English" — that's the India-Mode-off toggle on /india.
        link = page.get_by_test_id("continue-in-english")
        await expect(link).to_be_visible(timeout=3000)
        await link.click()

        # Toast fires from /india BEFORE we navigate to /, so assert it visible in the near term.
        await expect(page.get_by_text("India Mode off", exact=False).first).to_be_visible(timeout=4000)
        await page.screenshot(path=str(SCREENSHOTS / "2_toast.png"))

        # Wait for /india → / navigation to settle.
        await page.wait_for_url(f"{BASE_URL}/", timeout=5000)
        await page.wait_for_load_state("networkidle")
        # Give the transition effect + server clear a beat.
        await page.wait_for_timeout(600)
        await page.screenshot(path=str(SCREENSHOTS / "3_home_english.png"))

        # (a) Server-side history cleared for this user.
        remaining = count_server_messages(access_token, user_id, supabase_url, publishable_key)
        assert remaining == 0, f"expected 0 server messages after toggle, got {remaining}"

        # (b) Local storage: settings normalized, draft + india-scoped keys gone.
        state = await page.evaluate(
            """(sk) => ({
                settings: localStorage.getItem(sk),
                draft: localStorage.getItem('askeasy.draft.composer'),
                pending: localStorage.getItem('askeasy.attachments.pending'),
                session: sessionStorage.getItem('askeasy.india.session'),
                htmlClass: document.documentElement.className,
                bodyText: document.body.innerText,
            })""",
            SETTINGS_KEY,
        )
        persisted = json.loads(state["settings"])
        assert persisted["indiaMode"] is False, persisted
        assert persisted["language"] == "en", persisted
        assert state["draft"] is None, "draft.composer should be cleared"
        assert state["pending"] is None, "attachments.pending should be cleared"
        assert state["session"] is None, "session india key should be cleared"

        # (c) Home UI in English — no india theme, no leftover Gujarati bubble.
        assert "india" not in state["htmlClass"], f"india class should be gone, got {state['htmlClass']!r}"
        assert "કેમ છો" not in state["bodyText"], "seeded Gujarati message should be gone from UI"

        print("PASS: /india Continue-in-English clears server history + reloads home in English.")
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
