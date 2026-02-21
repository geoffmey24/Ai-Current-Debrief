"""
emailer.py
Sends the daily AI briefing via the Resend email API.
"""

import os
from datetime import datetime

import resend


def _markdown_to_html(text: str) -> str:
    """
    Very lightweight Markdown -> HTML conversion for the briefing body.
    Handles bold (**text**), headers (## / ###), and newlines.
    """
    import re

    lines = text.split("\n")
    html_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("### "):
            html_lines.append(f"<h3>{stripped[4:]}</h3>")
        elif stripped.startswith("## "):
            html_lines.append(f"<h2>{stripped[3:]}</h2>")
        elif stripped.startswith("# "):
            html_lines.append(f"<h1>{stripped[2:]}</h1>")
        elif stripped.startswith("- ") or stripped.startswith("* "):
            content = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", stripped[2:])
            html_lines.append(f"<li>{content}</li>")
        elif stripped == "":
            html_lines.append("<br>")
        else:
            content = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", stripped)
            html_lines.append(f"<p>{content}</p>")

    return "\n".join(html_lines)


def send_briefing_email(briefing_text: str) -> dict:
    """
    Send the briefing to RECIPIENT_EMAIL using Resend.
    Returns the Resend API response dict.
    """
    resend.api_key = os.getenv("RESEND_API_KEY")

    recipient = os.getenv("RECIPIENT_EMAIL")
    sender = os.getenv("SENDER_EMAIL", "briefing@yourdomain.com")

    if not recipient:
        raise EnvironmentError("RECIPIENT_EMAIL must be set in your .env file.")
    if not resend.api_key:
        raise EnvironmentError("RESEND_API_KEY must be set in your .env file.")

    today = datetime.now().strftime("%B %d, %Y")
    subject = f"AI Daily Briefing – {today}"

    body_html = _markdown_to_html(briefing_text)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="font-family: Georgia, serif; max-width: 680px; margin: 40px auto;
             padding: 0 20px; color: #1a1a1a; background: #ffffff;">
  <header style="border-bottom: 2px solid #0066cc; padding-bottom: 12px; margin-bottom: 24px;">
    <h1 style="margin: 0; color: #0066cc; font-size: 24px;">AI Daily Briefing</h1>
    <p style="margin: 4px 0 0; color: #666; font-size: 14px;">{today}</p>
  </header>

  <main style="line-height: 1.7; font-size: 15px;">
    {body_html}
  </main>

  <footer style="border-top: 1px solid #ddd; margin-top: 32px; padding-top: 12px;
                 color: #999; font-size: 12px;">
    Sourced from LinkedIn posts by leading AI companies.
    Summarized by Claude (Anthropic).
  </footer>
</body>
</html>"""

    params: resend.Emails.SendParams = {
        "from": sender,
        "to": [recipient],
        "subject": subject,
        "html": html,
    }

    response = resend.Emails.send(params)
    return response
