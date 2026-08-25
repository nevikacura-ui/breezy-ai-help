#!/usr/bin/env python3
"""End-to-end production test for the Puvio sign-in flow.

Exercises: /auth -> "Continue with Puvio" -> Puvio login -> /auth/callback
-> Supabase session minted -> logged-in home state (account avatar visible).

Usage:
  PUVIO_TEST_EMAIL=... PUVIO_TEST_PASSWORD=... python3 scripts/e2e_puvio_signin.py
  # optional: BASE_URL=https://askeasy.ai (default), HEADLESS=0, KEEP_SHOTS_DIR=...

Exit codes: 0 pass, 1 fail, 2 missing credentials/config.
Credentials are read from the environment only and never printed.
"""
import asyncio
import os
import sys
from pathlib import Path

from playwright.async_api import async_playwright

BASE_URL = os.environ.get("BASE_URL", "https://askeasy.ai").rstrip("/")
EMAIL = os.environ.get("PUVIO_TEST_EMAIL")
PASSWORD = os.environ.get("PUVIO_TEST_PASSWORD")
SHOTS = Path(os.environ.get("KEEP_SHOTS_DIR", "/tmp/browser/puvio-e2e"))
STEP_TIMEOUT = 30_000


def log(step: str, detail: str = "") -> None:
    print(f"[{step}] {detail}".rstrip(), flush=True)


async def run() -> int:
    SHOTS.mkdir(parents=True, exist_ok=True)
    console_errors: list[str] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=os.environ.get("HEADLESS") != "0")
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)

        try:
            # 1. Sign-in page renders the Puvio entry point.
            await page.goto(f"{BASE_URL}/auth", wait_until="domcontentloaded")
            btn = page.get_by_role("button", name="Continue with Puvio")
            await btn.wait_for(state="visible", timeout=STEP_TIMEOUT)
            await page.screenshot(path=str(SHOTS / "1_auth.png"))
            log("auth-page", "Continue with Puvio visible")

            # 2. Redirect to Puvio's hosted sign-in with PKCE params.
            await btn.click()
            await page.wait_for_url("**puvio.ai/**", timeout=STEP_TIMEOUT)
            await page.wait_for_load_state("domcontentloaded")
            await page.screenshot(path=str(SHOTS / "2_puvio_login.png"))
            log("puvio-redirect", page.url.split("?")[0])

            # 3. Authenticate with the test account.
            await page.get_by_label("Email", exact=False).first.fill(EMAIL)
            await page.get_by_label("Password", exact=False).first.fill(PASSWORD)
            await page.get_by_role("button", name="Sign in", exact=False).first.click()

            # Puvio may show a consent screen before redirecting back.
            try:
                await page.get_by_role("button", name="Allow", exact=False).first.click(timeout=8_000)
                log("consent", "approved")
            except Exception:
                log("consent", "not shown")

            # 4. Callback processes the code and navigates to the app.
            await page.wait_for_url(f"{BASE_URL}/**", timeout=STEP_TIMEOUT)
            await page.screenshot(path=str(SHOTS / "3_callback.png"))
            log("callback", page.url)

            failure = page.get_by_text("Sign-in failed")
            if await failure.count() and await failure.first.is_visible():
                body = (await page.inner_text("body"))[:400]
                log("FAIL", f"callback error: {body}")
                await page.screenshot(path=str(SHOTS / "4_failed.png"))
                return 1

            # 5. Logged-in home state: account avatar + a live Supabase session.
            await page.wait_for_url(lambda u: "/auth" not in u, timeout=STEP_TIMEOUT)
            await page.get_by_label("Account").wait_for(state="visible", timeout=STEP_TIMEOUT)
            await page.screenshot(path=str(SHOTS / "5_logged_in.png"))

            has_session = await page.evaluate(
                """() => Object.keys(localStorage).some(k =>
                     /^sb-.*-auth-token$/.test(k) && (localStorage.getItem(k) || '').includes('access_token'))"""
            )
            log("home", f"url={page.url} avatar=visible session={has_session}")
            if not has_session:
                log("FAIL", "no Supabase session persisted after callback")
                return 1

            if console_errors:
                log("console-errors", "; ".join(console_errors[:5]))
            log("PASS", f"signed in end-to-end via Puvio ({BASE_URL})")
            return 0
        except Exception as e:  # noqa: BLE001 - report and screenshot any step failure
            await page.screenshot(path=str(SHOTS / "error.png"))
            log("FAIL", f"{type(e).__name__}: {e}".split("\n")[0][:300])
            log("last-url", page.url)
            return 1
        finally:
            await browser.close()


if __name__ == "__main__":
    if not EMAIL or not PASSWORD:
        print("PUVIO_TEST_EMAIL and PUVIO_TEST_PASSWORD must be set (test Puvio account).")
        sys.exit(2)
    sys.exit(asyncio.run(run()))
