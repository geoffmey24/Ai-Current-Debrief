"""
summarizer.py
Uses the Anthropic Claude API to turn raw LinkedIn posts into a polished daily briefing.
"""

import os

import anthropic


def summarize_briefing(company_posts: dict[str, list[str]]) -> str:
    """
    Accept a dict of { "Company Name": ["post 1", "post 2", ...] }
    and return a formatted daily briefing string produced by Claude.
    """
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    # Build the raw post content block
    posts_block = ""
    for company, posts in company_posts.items():
        posts_block += f"\n\n## {company}\n"
        for i, post in enumerate(posts, start=1):
            posts_block += f"\nPost {i}:\n{post}\n"

    prompt = f"""You are a sharp AI industry analyst who writes a concise daily briefing \
for a busy professional. Below are recent LinkedIn posts from leading AI companies.

Create a well-structured daily briefing that covers:
1. **Key Announcements** – product launches, model releases, major updates
2. **Research Highlights** – papers, technical breakthroughs, benchmarks
3. **Business & Partnerships** – funding, deals, hirings, strategic moves
4. **Notable Trends** – themes appearing across multiple companies

Guidelines:
- Keep the total length under 600 words
- Use bullet points inside each section
- Be factual; do not editorialize
- If a section has nothing relevant, omit it

---
{posts_block}
---

Write the briefing now:"""

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )

    return message.content[0].text
