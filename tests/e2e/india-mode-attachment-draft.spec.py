"""
End-to-end test: turning India Mode off must fully remove any in-flight
attachment draft — both from storage (askeasy.attachments.pending and any
india/draft scoped keys) AND from the visible Composer UI (no chip left).

Flow:
  1. Seed India Mode ON + an attachment-draft storage key.
  2. Attach a real image via the Composer's hidden file input so a chip renders.
  3. Toggle India Mode OFF from the Settings sheet.
  4. Assert the storage draft keys are gone AND no attachment chip remains.

Run:
    python3 tests/e2e/india-mode-attachment-draft.spec.py
"""

import asyncio
import base64
from pathlib import Path
from playwright.async_api import async_playwright, expect

BASE_URL = "http://localhost:8080"
SCREENSHOTS = Path("/tmp/browser/india-mode-attachment-draft")
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

# 1x1 transparent PNG
PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAIAAAUAAeImBZsAAAAASUVORK5CYII="
)


async def seed_india(page):
    await page.evaluate(
        """([sk, s, mk]) => {
            localStorage.setItem(sk, JSON.stringify(s));
            localStorage.setItem(mk, JSON.stringify([]));
            localStorage.setItem('askeasy.attachments.pending',
                JSON.stringify([{id:'draft-1', type:'image', dataUrl:'data:image/png;base64,AAA', name:'seed.png'}]));
            localStorage.setItem('askeasy.draft.composer', 'kem cho');
            localStorage.setItem('askeasy.india.lastLang', 'gu');
            sessionStorage.setItem('askeasy.draft.voice', 'blob');
        }""",
        [SETTINGS_KEY, INDIA_SEED_SETTINGS, MESSAGES_KEY],
    )


async def main():
    tmp_png = SCREENSHOTS / "attach.png"
    tmp_png.write_bytes(PNG_BYTES)

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        # Origin, then seed, then reload.
        await page.goto(BASE_URL, wait_until="domcontentloaded")
        await seed_india(page)
        await page.reload(wait_until="domcontentloaded")
        await page.wait_for_load_state("networkidle")

        html_class = await page.evaluate("document.documentElement.className")
        assert "india" in html_class, f"expected india class, got {html_class!r}"

        # Attach a real image via the hidden file input so a chip renders.
        file_input = page.locator('input[type="file"]').first
        await file_input.set_input_files(str(tmp_png))
        # Wait for chip to render.
        chip_img = page.locator('img[src^="data:image/png"]').first
        await expect(chip_img).to_be_visible(timeout=3000)
        await page.screenshot(path=str(SCREENSHOTS / "1_chip_visible.png"))

        # Confirm at least one attachment chip exists.
        assert await page.get_by_role("button", name="Remove").count() >= 1, "expected an attachment remove button"

        # Open Settings sheet (aria-label is localized, target icon).
        await page.locator("button:has(svg.lucide-settings-2)").click()
        await page.wait_for_timeout(300)

        # Toggle India Mode off.
        india_switch = page.get_by_role("switch").first
        assert await india_switch.get_attribute("data-state") == "checked", "India switch should start checked"
        await india_switch.click()

        # Off toast confirms handler ran.
        await expect(page.get_by_text("India Mode off", exact=False).first).to_be_visible(timeout=3000)
        await page.wait_for_timeout(400)

        # Close sheet, inspect Composer.
        await page.keyboard.press("Escape")
        await page.wait_for_timeout(300)
        await page.screenshot(path=str(SCREENSHOTS / "2_after_off.png"))

        # Storage: attachment-draft + india-scoped keys gone; unrelated survive.
        storage = await page.evaluate(
            """() => ({
                pending: localStorage.getItem('askeasy.attachments.pending'),
                draftComposer: localStorage.getItem('askeasy.draft.composer'),
                lastLang: localStorage.getItem('askeasy.india.lastLang'),
                voice: sessionStorage.getItem('askeasy.draft.voice'),
                htmlClass: document.documentElement.className,
            })"""
        )
        assert storage["pending"] is None, f"attachments.pending should be cleared, got {storage['pending']!r}"
        assert storage["draftComposer"] is None, "draft.composer should be cleared"
        assert storage["lastLang"] is None, "india.lastLang should be cleared"
        assert storage["voice"] is None, "session draft.voice should be cleared"
        assert "india" not in storage["htmlClass"], f"india class should be gone, got {storage['htmlClass']!r}"

        # UI: no attachment chip left.
        assert await page.get_by_role("button", name="Remove").count() == 0, \
            "attachment chip should be removed from the Composer"
        assert await page.locator('img[src^="data:image/png"]').count() == 0, \
            "attachment preview image should be gone"

        print("PASS: India Mode off clears attachment draft from storage and UI.")
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
