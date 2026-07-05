"""
End-to-end test: turning India Mode off from the Settings sheet must
  1. clear India-scoped localStorage/sessionStorage drafts + cached messages
  2. surface the "India Mode off" success toast
  3. reload the home UI in English (no `india` class on <html>, English greeting)

Run against the local dev server (http://localhost:8080).

    python3 tests/e2e/india-mode-off.spec.py
"""

import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright, expect

BASE_URL = "http://localhost:8080"
SCREENSHOTS = Path("/tmp/browser/india-mode-off")
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

INDIA_SEED_MESSAGES = [
    {"id": "m1", "role": "user", "content": "કેમ છો", "attachments": [], "createdAt": 1},
    {"id": "m2", "role": "assistant", "content": "મજામાં", "attachments": [], "createdAt": 2},
]


async def seed_india_mode(page):
    """Prime localStorage + sessionStorage as if the user was mid-conversation in India Mode."""
    await page.evaluate(
        """([settingsKey, settings, messagesKey, messages]) => {
            localStorage.setItem(settingsKey, JSON.stringify(settings));
            localStorage.setItem(messagesKey, JSON.stringify(messages));
            localStorage.setItem('askeasy.india.lastLang', 'gu');
            localStorage.setItem('askeasy.language.override', 'gu');
            localStorage.setItem('askeasy.draft.composer', 'kem cho');
            localStorage.setItem('askeasy.attachments.pending', JSON.stringify([{id:'a'}]));
            sessionStorage.setItem('askeasy.india.session', '1');
            sessionStorage.setItem('askeasy.draft.voice', 'blob');
            localStorage.setItem('unrelated', 'keep-me');
        }""",
        [SETTINGS_KEY, INDIA_SEED_SETTINGS, MESSAGES_KEY, INDIA_SEED_MESSAGES],
    )


async def read_storage(page):
    return await page.evaluate(
        """() => {
            const dump = (s) => {
                const out = {};
                for (let i = 0; i < s.length; i++) { const k = s.key(i); out[k] = s.getItem(k); }
                return out;
            };
            return { local: dump(localStorage), session: dump(sessionStorage),
                     htmlClass: document.documentElement.className };
        }"""
    )


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        # First load — establish origin, then seed India Mode state.
        await page.goto(BASE_URL, wait_until="domcontentloaded")
        await seed_india_mode(page)
        await page.reload(wait_until="domcontentloaded")
        await page.wait_for_load_state("networkidle")
        await page.screenshot(path=str(SCREENSHOTS / "1_india_on.png"))

        # Sanity: India theme class is applied.
        html_class = await page.evaluate("document.documentElement.className")
        assert "india" in html_class, f"expected india class before toggle, got {html_class!r}"

        # Open Settings sheet.
        await page.get_by_role("button", name="Settings").click()
        await page.wait_for_timeout(300)
        await page.screenshot(path=str(SCREENSHOTS / "2_settings_open.png"))

        # Flip the India Mode switch off (it's the only Switch in the India section
        # and is currently checked, so target by role+state).
        india_switch = page.get_by_role("switch").first
        assert await india_switch.get_attribute("data-state") == "checked", "India switch should start checked"
        await india_switch.click()

        # Toast should appear.
        toast = page.get_by_text("India Mode off", exact=False)
        await expect(toast).to_be_visible(timeout=3000)
        await page.screenshot(path=str(SCREENSHOTS / "3_toast.png"))

        # Give the reset effect a beat to flush storage writes.
        await page.wait_for_timeout(400)

        state = await read_storage(page)
        local, session, html_class = state["local"], state["session"], state["htmlClass"]

        # Cached messages + India-scoped drafts must be gone.
        assert MESSAGES_KEY not in local, f"messages should be cleared, got {local.get(MESSAGES_KEY)!r}"
        for k in [
            "askeasy.india.lastLang",
            "askeasy.language.override",
            "askeasy.draft.composer",
            "askeasy.attachments.pending",
        ]:
            assert k not in local, f"{k} should be cleared"
        for k in ["askeasy.india.session", "askeasy.draft.voice"]:
            assert k not in session, f"session {k} should be cleared"

        # Unrelated keys survive.
        assert local.get("unrelated") == "keep-me", "unrelated keys must not be wiped"

        # Persisted settings rewritten to English + indiaMode:false.
        persisted = json.loads(local[SETTINGS_KEY])
        assert persisted["indiaMode"] is False, persisted
        assert persisted["language"] == "en", persisted
        # Preserved:
        assert persisted["name"] == "Ravi"
        assert persisted["indiaOnboarded"] is True

        # Home UI should be back in English — no `india` class on <html>.
        assert "india" not in html_class, f"india class should be gone, got {html_class!r}"

        # Close the sheet so we can screenshot the reloaded home.
        await page.keyboard.press("Escape")
        await page.wait_for_timeout(300)
        await page.screenshot(path=str(SCREENSHOTS / "4_home_english.png"))

        # No leftover Gujarati bubbles.
        body_text = await page.locator("body").inner_text()
        assert "કેમ છો" not in body_text, "seeded Gujarati message should be cleared from UI"

        print("PASS: India Mode off clears storage, shows toast, restores English UI.")
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
