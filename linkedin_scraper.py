"""
linkedin_scraper.py
Fetches recent posts from AI company LinkedIn pages using the unofficial linkedin-api.
"""

import logging
import os

from linkedin_api import Linkedin

logger = logging.getLogger(__name__)

# LinkedIn company slugs for the companies we want to track.
# To add/remove companies, edit this dict: { "Display Name": "linkedin-slug" }
AI_COMPANIES = {
    "OpenAI": "openai",
    "Anthropic": "anthropic",
    "Google DeepMind": "google-deepmind",
    "Meta AI": "meta",
    "Microsoft": "microsoft",
    "Mistral AI": "mistralai",
    "xAI": "x-ai",
    "Cohere": "cohere",
    "Hugging Face": "huggingface",
    "Stability AI": "stability-ai",
}


def _get_client() -> Linkedin:
    email = os.getenv("LINKEDIN_EMAIL")
    password = os.getenv("LINKEDIN_PASSWORD")
    if not email or not password:
        raise EnvironmentError(
            "LINKEDIN_EMAIL and LINKEDIN_PASSWORD must be set in your .env file."
        )
    logger.info("Authenticating with LinkedIn...")
    return Linkedin(email, password)


def _extract_post_text(update: dict) -> str | None:
    """
    Pull the human-readable text out of a raw LinkedIn update dict.
    LinkedIn's internal API nests data differently across update types;
    we try the most common paths and return None if nothing useful is found.
    """
    try:
        v2 = update.get("value", {}).get(
            "com.linkedin.voyager.feed.render.UpdateV2", {}
        )

        # Path 1: standard text commentary
        commentary = v2.get("commentary", {})
        text_obj = commentary.get("text", {})
        text = text_obj.get("text", "") if isinstance(text_obj, dict) else str(text_obj)
        if text and len(text.strip()) > 20:
            return text.strip()

        # Path 2: article / share headline
        content = v2.get("content", {})
        for val in content.values():
            if not isinstance(val, dict):
                continue
            title = val.get("title", {})
            title_text = title.get("text", "") if isinstance(title, dict) else str(title)
            if title_text and len(title_text.strip()) > 10:
                return title_text.strip()

        # Path 3: reshared content description
        reshared = v2.get("resharedUpdate", {})
        if reshared:
            return _extract_post_text({"value": {"com.linkedin.voyager.feed.render.UpdateV2": reshared}})

    except Exception as exc:
        logger.debug("Text extraction failed for one update: %s", exc)

    return None


def get_company_posts(client: Linkedin, company_slug: str, num_posts: int = 5) -> list[str]:
    """Return a list of text strings from recent posts for one company."""
    try:
        updates = client.get_company_updates(company_slug, results=num_posts)
    except Exception as exc:
        logger.warning("Could not fetch updates for '%s': %s", company_slug, exc)
        return []

    posts = []
    for update in updates:
        text = _extract_post_text(update)
        if text:
            posts.append(text)

    return posts


def fetch_all_company_posts(num_posts_per_company: int = 5) -> dict[str, list[str]]:
    """
    Authenticate once and fetch recent posts from every tracked AI company.

    Returns a dict of { "Company Name": ["post text", ...] }
    only including companies that had at least one readable post.
    """
    client = _get_client()
    results: dict[str, list[str]] = {}

    for company_name, slug in AI_COMPANIES.items():
        logger.info("Fetching posts for %s (%s)...", company_name, slug)
        posts = get_company_posts(client, slug, num_posts=num_posts_per_company)
        if posts:
            results[company_name] = posts
            logger.info("  -> %d post(s) retrieved", len(posts))
        else:
            logger.info("  -> no readable posts found")

    return results
