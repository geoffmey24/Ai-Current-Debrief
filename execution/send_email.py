"""
send_email.py
-------------
Sends the daily AI debrief markdown summary as a formatted HTML email via Resend.

Input:  .tmp/daily_summary_YYYYMMDD.md
Output: Email delivered to EMAIL_TO
"""

import os
import re
import sys
import requests
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

DATE_STR     = datetime.now().strftime("%Y%m%d")
SUMMARY_FILE = Path(f".tmp/daily_summary_{DATE_STR}.md")


# ---------------------------------------------------------------------------
# Minimal markdown → HTML converter (no external deps)
# ---------------------------------------------------------------------------

def md_to_html(md: str) -> str:
    """
    Convert a subset of GitHub-flavored Markdown to HTML.
    Handles: headings, bold, bullet lists, horizontal rules, paragraphs.
    """
    lines   = md.split("\n")
    html    = []
    in_list = False

    for line in lines:
        # Horizontal rule
        if re.match(r"^---+$", line.strip()):
            if in_list:
                html.append("</ul>")
                in_list = False
            html.append("<hr>")
            continue

        # Headings
        m = re.match(r"^(#{1,3})\s+(.*)", line)
        if m:
            if in_list:
                html.append("</ul>")
                in_list = False
            level = len(m.group(1))
            text  = _inline(m.group(2))
            html.append(f"<h{level}>{text}</h{level}>")
            continue

        # Bullet list items
        m = re.match(r"^[-*]\s+(.*)", line)
        if m:
            if not in_list:
                html.append("<ul>")
                in_list = True
            html.append(f"<li>{_inline(m.group(1))}</li>")
            continue

        # Close list if we hit a non-list line
        if in_list and line.strip():
            html.append("</ul>")
            in_list = False

        # Empty line → paragraph break
        if not line.strip():
            html.append("")
            continue

        # Normal paragraph text
        html.append(f"<p>{_inline(line)}</p>")

    if in_list:
        html.append("</ul>")

    return "\n".join(html)


def _inline(text: str) -> str:
    """Apply inline markdown: **bold**, *italic*, `code`."""
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"\*(.+?)\*",     r"<em>\1</em>",         text)
    text = re.sub(r"`(.+?)`",       r"<code>\1</code>",      text)
    return text


# ---------------------------------------------------------------------------
# Email builder
# ---------------------------------------------------------------------------

EMAIL_STYLE = """
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    font-size: 15px;
    line-height: 1.6;
    color: #1a1a1a;
    background: #f5f5f5;
    margin: 0;
    padding: 20px;
}
.card {
    background: #ffffff;
    border-radius: 8px;
    max-width: 620px;
    margin: 0 auto;
    padding: 32px 36px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
h1 { font-size: 22px; color: #111; margin-top: 0; border-bottom: 2px solid #e8e8e8; padding-bottom: 12px; }
h2 { font-size: 17px; color: #222; margin-top: 28px; }
h3 { font-size: 15px; color: #333; }
ul { padding-left: 20px; }
li { margin-bottom: 6px; }
hr { border: none; border-top: 1px solid #e8e8e8; margin: 24px 0; }
p  { margin: 8px 0; }
.footer { font-size: 12px; color: #999; margin-top: 24px; }
"""


def build_html_email(md_content: str) -> str:
    body_html = md_to_html(md_content)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>{EMAIL_STYLE}</style>
</head>
<body>
  <div class="card">
    {body_html}
  </div>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Send
# ---------------------------------------------------------------------------

def send(md_content: str):
    api_key    = os.getenv("RESEND_API_KEY")
    email_from = os.getenv("EMAIL_FROM", "AI Debrief <onboarding@resend.dev>")
    email_to   = os.getenv("EMAIL_TO")

    missing = [k for k, v in {
        "RESEND_API_KEY": api_key, "EMAIL_TO": email_to
    }.items() if not v]
    if missing:
        print(f"ERROR: Missing env vars: {', '.join(missing)}")
        sys.exit(1)

    date_str = datetime.now().strftime("%B %d, %Y")
    subject  = f"AI Daily Debrief — {date_str}"

    print(f"Sending email to {email_to} via Resend...")
    resp = requests.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "from":    email_from,
            "to":      [email_to],
            "subject": subject,
            "text":    md_content,
            "html":    build_html_email(md_content),
        },
        timeout=30,
    )

    if resp.status_code not in (200, 201):
        print(f"ERROR: Resend returned {resp.status_code}: {resp.text}")
        sys.exit(1)

    print(f"Email sent successfully. ID: {resp.json().get('id')}")


def main():
    if not SUMMARY_FILE.exists():
        print(f"ERROR: Summary file not found: {SUMMARY_FILE}")
        print("Run generate_summary.py first.")
        sys.exit(1)

    md_content = SUMMARY_FILE.read_text()
    send(md_content)


if __name__ == "__main__":
    main()
