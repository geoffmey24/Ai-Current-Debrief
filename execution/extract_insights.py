"""
extract_insights.py
-------------------
For each scraped LinkedIn post, calls the Claude API to extract:
  - 2-3 key insights (concise, specific)
  - A short topic label

Input:  .tmp/raw_posts_YYYYMMDD.json
Output: .tmp/insights_YYYYMMDD.json
"""

import json
import sys
import time
from datetime import datetime
from pathlib import Path

import anthropic
from dotenv import load_dotenv

load_dotenv()

DATE_STR    = datetime.now().strftime("%Y%m%d")
INPUT_FILE  = Path(f".tmp/raw_posts_{DATE_STR}.json")
OUTPUT_FILE = Path(f".tmp/insights_{DATE_STR}.json")

client = anthropic.Anthropic()

EXTRACT_PROMPT = """\
Extract 2-3 key insights from the following LinkedIn post by {company}.
Be specific and factual — focus on announcements, new features, partnerships, research findings, or strategic signals.
Skip generic marketing language.

Post:
{text}

Respond ONLY with valid JSON in this exact format:
{{
  "topic": "<3-5 word topic label>",
  "insights": [
    "<insight 1 — 1-2 sentences>",
    "<insight 2 — 1-2 sentences>"
  ]
}}"""


def extract_insights(post: dict) -> dict:
    """Call Claude to extract insights from a single post. Returns enriched post dict."""
    prompt = EXTRACT_PROMPT.format(
        company=post["company"].upper(),
        text=post["text"][:3000],  # cap to avoid token blowout
    )

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()
        result = json.loads(raw)
        insights = result.get("insights", [])
        topic    = result.get("topic", "Update")
    except (json.JSONDecodeError, KeyError, IndexError) as e:
        print(f"  WARNING: Failed to parse Claude response for {post['company']}: {e}")
        # Fallback: use truncated post text as the single insight
        insights = [post["text"][:300].strip()]
        topic    = "Update"
    except anthropic.RateLimitError:
        print("  Rate limited — waiting 30s before retrying...")
        time.sleep(30)
        return extract_insights(post)  # one retry

    return {
        **post,
        "topic":    topic,
        "insights": insights,
    }


def main():
    if not INPUT_FILE.exists():
        print(f"ERROR: Input file not found: {INPUT_FILE}")
        print("Run scrape_linkedin_posts.py first.")
        sys.exit(1)

    posts = json.loads(INPUT_FILE.read_text())
    if not posts:
        print("No posts to process — writing empty insights file.")
        OUTPUT_FILE.write_text(json.dumps([], indent=2))
        return

    print(f"Extracting insights from {len(posts)} post(s)...")

    enriched = []
    for i, post in enumerate(posts, 1):
        print(f"  [{i}/{len(posts)}] {post['company']}: {post['text'][:60]}...")
        enriched_post = extract_insights(post)
        enriched.append(enriched_post)
        time.sleep(0.5)  # light throttle

    OUTPUT_FILE.write_text(json.dumps(enriched, indent=2))
    print(f"\nDone. Insights saved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
