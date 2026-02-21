"""
generate_summary.py
-------------------
Aggregates all extracted insights and asks Claude to write an executive
daily debrief in markdown format.

Input:  .tmp/insights_YYYYMMDD.json
Output: .tmp/daily_summary_YYYYMMDD.md
        (also returns the markdown string for use by callers)
"""

import json
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

import anthropic
from dotenv import load_dotenv

load_dotenv()

DATE_STR    = datetime.now().strftime("%Y%m%d")
INPUT_FILE  = Path(f".tmp/insights_{DATE_STR}.json")
OUTPUT_FILE = Path(f".tmp/daily_summary_{DATE_STR}.md")

client = anthropic.Anthropic()

SUMMARY_PROMPT = """\
You are an AI industry analyst writing a concise daily debrief for a founder who \
needs to stay current on AI in under 2 minutes.

Today is {date}. Here are the key insights from LinkedIn posts by AI companies today:

{context}

Write the debrief in this exact markdown structure:

## Executive Summary
2-3 sentences covering the most important news or signal of the day.

## Company Highlights
For each company that posted, one bullet with the most important takeaway. \
Skip companies with nothing substantive. \
Format: **Company**: takeaway.

## Big Picture
One short paragraph connecting themes across companies — what does today's \
activity signal about the direction of AI?

Rules: no fluff, no filler phrases like "it's worth noting", be direct and specific."""


def build_context(posts: list[dict]) -> str:
    """Format posts into a readable block for the summary prompt."""
    by_company = defaultdict(list)
    for post in posts:
        by_company[post["company"]].append(post)

    lines = []
    for company, company_posts in by_company.items():
        lines.append(f"### {company.upper()}")
        for post in company_posts:
            topic = post.get("topic", "Update")
            lines.append(f"Topic: {topic}")
            for insight in post.get("insights", []):
                lines.append(f"- {insight}")
        lines.append("")

    return "\n".join(lines)


def main() -> str:
    """Generate the daily summary. Returns the markdown string."""
    if not INPUT_FILE.exists():
        print(f"ERROR: Input file not found: {INPUT_FILE}")
        print("Run extract_insights.py first.")
        sys.exit(1)

    posts = json.loads(INPUT_FILE.read_text())
    date_str = datetime.now().strftime("%B %d, %Y")

    if not posts:
        # No posts at all today — write a brief note instead of calling Claude
        summary_md = f"# AI Daily Debrief — {date_str}\n\nNo new posts found across monitored companies in the last 25 hours.\n"
        OUTPUT_FILE.write_text(summary_md)
        print(f"No posts found. Placeholder summary saved to: {OUTPUT_FILE}")
        return summary_md

    context = build_context(posts)
    prompt  = SUMMARY_PROMPT.format(date=date_str, context=context)

    print("Generating executive summary with Claude...")
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=800,
        messages=[{"role": "user", "content": prompt}],
    )

    body = response.content[0].text.strip()

    summary_md = (
        f"# AI Daily Debrief — {date_str}\n\n"
        f"{body}\n\n"
        f"---\n"
        f"*{len(posts)} post(s) from "
        f"{len(set(p['company'] for p in posts))} company/companies · "
        f"Generated {datetime.now().strftime('%H:%M UTC')}*\n"
    )

    OUTPUT_FILE.write_text(summary_md)
    print(f"Summary saved to: {OUTPUT_FILE}")
    return summary_md


if __name__ == "__main__":
    print(main())
