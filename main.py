"""
main.py
Entry point for the AI Current Debrief tool.

Usage:
    python main.py

The script will:
  1. Authenticate with LinkedIn and fetch recent posts from tracked AI companies
  2. Use Claude to summarize them into a daily briefing
  3. Email the briefing via Resend

All credentials are read from a .env file (see .env.example).
"""

import logging
import os
import sys

from dotenv import load_dotenv

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(levelname)s]  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

REQUIRED_ENV_VARS = [
    "LINKEDIN_EMAIL",
    "LINKEDIN_PASSWORD",
    "ANTHROPIC_API_KEY",
    "RESEND_API_KEY",
    "RECIPIENT_EMAIL",
]


def _check_env() -> None:
    """Fail fast if any required variable is missing from the environment."""
    missing = [k for k in REQUIRED_ENV_VARS if not os.getenv(k)]
    if missing:
        logger.error(
            "Missing required environment variables: %s\n"
            "Copy .env.example to .env and fill in the values.",
            ", ".join(missing),
        )
        sys.exit(1)


def main() -> None:
    load_dotenv()
    _check_env()

    # Lazy imports so missing packages produce a clear error message
    from linkedin_scraper import fetch_all_company_posts
    from summarizer import summarize_briefing
    from emailer import send_briefing_email

    # --- Step 1: Scrape LinkedIn -------------------------------------------------
    logger.info("Step 1/3  Fetching LinkedIn posts from AI companies...")
    company_posts = fetch_all_company_posts()

    if not company_posts:
        logger.warning(
            "No readable posts found from any company. "
            "Check your LinkedIn credentials and try again."
        )
        sys.exit(0)

    logger.info("Found posts from %d company/companies.", len(company_posts))

    # --- Step 2: Summarize with Claude ------------------------------------------
    logger.info("Step 2/3  Generating briefing with Claude...")
    briefing = summarize_briefing(company_posts)
    logger.info("Briefing generated (%d chars).", len(briefing))

    # --- Step 3: Send email via Resend ------------------------------------------
    logger.info("Step 3/3  Sending briefing email...")
    response = send_briefing_email(briefing)
    logger.info("Email sent successfully. Resend ID: %s", response.get("id", "n/a"))


if __name__ == "__main__":
    main()
