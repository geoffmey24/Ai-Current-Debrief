"""
scrape_linkedin_posts.py
------------------------
Scrapes recent LinkedIn posts from target AI companies.
Uses Playwright (sync API) with session caching to avoid repeated logins.

Output: .tmp/raw_posts_YYYYMMDD.json
"""

import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

load_dotenv()

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

COMPANIES = {
    "grok":      "https://www.linkedin.com/company/grok-ai/posts/?feedView=all",
    "claude":    "https://www.linkedin.com/showcase/claude/posts/?feedView=all",
    "anthropic": "https://www.linkedin.com/company/anthropicresearch/posts/?feedView=all",
    "openai":    "https://www.linkedin.com/company/openai/posts/?feedView=all",
    "n8n":       "https://www.linkedin.com/company/n8n/posts/?feedView=all",
}

# Posts older than this many hours are ignored
POST_HORIZON_HOURS = 25

SESSION_FILE = Path(".tmp/linkedin_session.json")
DATE_STR     = datetime.now().strftime("%Y%m%d")
OUTPUT_FILE  = Path(f".tmp/raw_posts_{DATE_STR}.json")

# Run headless by default; set HEADLESS=false in env to watch the browser
HEADLESS = os.getenv("HEADLESS", "true").lower() != "false"

# ---------------------------------------------------------------------------
# Selectors — update here if LinkedIn changes their DOM
# ---------------------------------------------------------------------------

SELECTORS = {
    # Container for each post in the feed
    "post_container": [
        ".feed-shared-update-v2",
        ".occludable-update",
        "[data-urn]",
    ],
    # Post body text
    "post_text": [
        ".feed-shared-update-v2__description .update-components-text",
        ".feed-shared-text span[dir='ltr']",
        ".attributed-text-segment-list__content",
        ".update-components-text",
    ],
    # Timestamp element (must have a datetime attribute)
    "post_time": [
        "time[datetime]",
        ".feed-shared-actor__sub-description time",
    ],
    # "See more" expand buttons
    "see_more": [
        "button.inline-show-more-text__button",
        "button.feed-shared-inline-show-more-text__see-more-less-toggle",
    ],
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _try_selector(element, selector_list):
    """Try a list of CSS selectors, return the first match or None."""
    for sel in selector_list:
        try:
            el = element.query_selector(sel)
            if el:
                return el
        except Exception:
            continue
    return None


def _parse_relative_time(text: str) -> datetime | None:
    """
    Parse LinkedIn relative timestamps like '1h', '2d', '1w'.
    Returns a UTC-naive datetime or None if unparseable.
    """
    text = text.strip().lower()
    now = datetime.utcnow()
    if text.endswith("s"):          # seconds
        return now - timedelta(seconds=int(text[:-1]))
    if text.endswith("m"):          # minutes
        return now - timedelta(minutes=int(text[:-1]))
    if text.endswith("h"):          # hours
        return now - timedelta(hours=int(text[:-1]))
    if text.endswith("d"):          # days
        return now - timedelta(days=int(text[:-1]))
    if text.endswith("w"):          # weeks
        return now - timedelta(weeks=int(text[:-1]))
    return None


# ---------------------------------------------------------------------------
# LinkedIn auth
# ---------------------------------------------------------------------------

def login(page):
    """Log in with credentials from .env."""
    email    = os.getenv("LINKEDIN_EMAIL")
    password = os.getenv("LINKEDIN_PASSWORD")

    if not email or not password:
        print("ERROR: LINKEDIN_EMAIL / LINKEDIN_PASSWORD not set in .env")
        sys.exit(1)

    print("Logging in to LinkedIn...")
    page.goto("https://www.linkedin.com/login", wait_until="domcontentloaded")
    page.wait_for_selector("#username", timeout=15000)
    page.fill("#username", email)
    page.fill("#password", password)
    page.click("[type=submit]")
    page.wait_for_load_state("networkidle")

    if "checkpoint" in page.url or "challenge" in page.url:
        if not HEADLESS:
            print("Security challenge detected. Please solve it in the browser window.")
            input("Press Enter when done...")
        else:
            raise RuntimeError(
                "LinkedIn security challenge detected.\n"
                "Run once with HEADLESS=false to solve it manually and cache the session:\n"
                "  HEADLESS=false python execution/scrape_linkedin_posts.py"
            )

    print("Login successful.")


def load_or_create_session(context, page):
    """Load cached cookies if they exist; otherwise log in and save cookies."""
    SESSION_FILE.parent.mkdir(parents=True, exist_ok=True)

    if SESSION_FILE.exists():
        cookies = json.loads(SESSION_FILE.read_text())
        context.add_cookies(cookies)
        page.goto("https://www.linkedin.com/feed/", wait_until="domcontentloaded")
        # Still logged in?
        if "feed" in page.url or "mynetwork" in page.url:
            print("Reusing saved LinkedIn session.")
            return
        print("Saved session expired, re-authenticating...")

    login(page)
    cookies = context.cookies()
    SESSION_FILE.write_text(json.dumps(cookies, indent=2))
    print(f"Session saved to {SESSION_FILE}")


# ---------------------------------------------------------------------------
# Scraping
# ---------------------------------------------------------------------------

def expand_see_more(page):
    """Click all 'See more' buttons to reveal full post text."""
    for sel in SELECTORS["see_more"]:
        buttons = page.query_selector_all(sel)
        for btn in buttons:
            try:
                btn.click()
                time.sleep(0.3)
            except Exception:
                pass


def scrape_company_posts(page, company: str, url: str) -> list[dict]:
    """Navigate to a company's posts page and extract recent posts."""
    cutoff = datetime.utcnow() - timedelta(hours=POST_HORIZON_HOURS)
    posts  = []

    print(f"  Scraping {company}: {url}")
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_load_state("networkidle")
    except PlaywrightTimeout:
        print(f"  WARNING: Timeout loading {company} page, skipping.")
        return []

    time.sleep(2)

    # Scroll to trigger lazy-loaded posts
    for _ in range(4):
        page.evaluate("window.scrollBy(0, window.innerHeight * 2)")
        time.sleep(1.5)

    expand_see_more(page)

    # Collect post containers
    containers = []
    for sel in SELECTORS["post_container"]:
        containers = page.query_selector_all(sel)
        if containers:
            break

    if not containers:
        print(f"  WARNING: No post containers found for {company}. Selectors may be stale.")
        return []

    for el in containers:
        try:
            # --- Text ---
            text_el = _try_selector(el, SELECTORS["post_text"])
            if not text_el:
                continue
            text = text_el.inner_text().strip()
            if not text:
                continue

            # --- Timestamp ---
            post_time = datetime.utcnow()  # fallback
            time_el = _try_selector(el, SELECTORS["post_time"])
            if time_el:
                dt_attr = time_el.get_attribute("datetime")
                rel_txt = time_el.inner_text()
                if dt_attr:
                    try:
                        post_time = datetime.fromisoformat(
                            dt_attr.replace("Z", "+00:00")
                        ).replace(tzinfo=None)
                    except ValueError:
                        pass
                elif rel_txt:
                    parsed = _parse_relative_time(rel_txt)
                    if parsed:
                        post_time = parsed

            # --- Filter by age ---
            if post_time < cutoff:
                continue

            posts.append({
                "company":    company,
                "text":       text,
                "timestamp":  post_time.isoformat(),
                "scraped_at": datetime.utcnow().isoformat(),
            })

        except Exception as e:
            print(f"  WARNING: Error parsing a post for {company}: {e}")
            continue

    print(f"  Found {len(posts)} recent post(s) for {company}.")
    return posts


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    Path(".tmp").mkdir(exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=HEADLESS,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/121.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 900},
        )
        page = context.new_page()

        load_or_create_session(context, page)

        all_posts = []
        for company, url in COMPANIES.items():
            posts = scrape_company_posts(page, company, url)
            all_posts.extend(posts)

        browser.close()

    OUTPUT_FILE.write_text(json.dumps(all_posts, indent=2))
    print(f"\nTotal posts scraped: {len(all_posts)}")
    print(f"Saved to: {OUTPUT_FILE}")
    return str(OUTPUT_FILE)


if __name__ == "__main__":
    main()
