# Directive: AI LinkedIn Daily Debrief

## Goal
Every day at 8 AM, scrape the latest LinkedIn posts from key AI companies,
extract key insights per post using Claude, and email a concise daily summary.

## Target Companies

| Company  | LinkedIn URL |
|----------|-------------|
| Grok     | https://www.linkedin.com/company/grok-ai/posts/?feedView=all |
| Claude   | https://www.linkedin.com/showcase/claude/posts/?feedView=all |
| Anthropic| https://www.linkedin.com/company/anthropicresearch/posts/?feedView=all |
| OpenAI   | https://www.linkedin.com/company/openai/posts/?feedView=all |
| n8n      | https://www.linkedin.com/company/n8n/posts/?feedView=all |

## Pipeline (run in order)

1. `execution/scrape_linkedin_posts.py`
   - Input: company URLs above
   - Action: Log in (or reuse saved session), navigate each company page, scroll
     to load posts, extract post text + timestamp for posts in the last 25 hours
   - Output: `.tmp/raw_posts_YYYYMMDD.json`

2. `execution/extract_insights.py`
   - Input: `.tmp/raw_posts_YYYYMMDD.json`
   - Action: For each post, call Claude API → extract 2-3 key insights + topic label
   - Output: `.tmp/insights_YYYYMMDD.json`

3. `execution/generate_summary.py`
   - Input: `.tmp/insights_YYYYMMDD.json`
   - Action: Aggregate all insights, call Claude API → produce executive summary markdown
   - Output: `.tmp/daily_summary_YYYYMMDD.md`

4. `execution/send_email.py`
   - Input: `.tmp/daily_summary_YYYYMMDD.md`
   - Action: Convert markdown → HTML, send via SMTP
   - Output: Email delivered to EMAIL_TO

**Orchestrator** (calls all four steps): `execution/run_daily_debrief.py`

## Required Environment Variables (.env)

```
ANTHROPIC_API_KEY=       # Claude API key

LINKEDIN_EMAIL=          # LinkedIn account email
LINKEDIN_PASSWORD=       # LinkedIn account password

EMAIL_TO=                # Where to send the daily debrief
SMTP_USER=               # SMTP login (e.g. your Gmail address)
SMTP_PASSWORD=           # App password (not your regular password for Gmail)
SMTP_HOST=smtp.gmail.com # Default: Gmail
SMTP_PORT=587            # Default: 587 (TLS)
EMAIL_FROM=              # Optional – defaults to SMTP_USER
```

## First-Time Setup

```bash
pip install -r requirements.txt
playwright install chromium
cp .env.example .env     # then fill in all values
python execution/run_daily_debrief.py
```

## Cron Schedule (8 AM daily)

```
0 8 * * * cd /home/user/Ai-Current-Debrief && /usr/bin/python3 execution/run_daily_debrief.py >> .tmp/cron.log 2>&1
```

## Session Caching
- After first successful login, cookies are saved to `.tmp/linkedin_session.json`
- Subsequent runs reuse the session (avoids logging in every time)
- If session expires, the script re-authenticates automatically

## Common Issues & Fixes

| Problem | Fix |
|---------|-----|
| LinkedIn security checkpoint / CAPTCHA | Run with `HEADLESS=false` env var set, solve the challenge manually once, session is saved |
| No posts found for a company | Company may not have posted recently — script logs a warning and continues |
| Selectors broken (LinkedIn DOM change) | Update `SELECTORS` dict at top of `scrape_linkedin_posts.py`; check DevTools for current class names |
| Gmail SMTP "Username and Password not accepted" | **Must use a Gmail App Password**, not your regular password. Google removed regular-password SMTP in 2024. Go to: myaccount.google.com → Security → 2-Step Verification → App Passwords. Takes 30 seconds. |
| 2FA required on LinkedIn | Log in manually in a browser once to establish session, copy the `li_at` cookie value into `.tmp/linkedin_session.json` |
| Claude API returns empty JSON / parse error | Claude sometimes wraps JSON in markdown fences. Fixed in extract_insights.py — strips ` ```json ` before parsing. |
| Scraper not reaching LinkedIn (ERR_INVALID_AUTH_CREDENTIALS) | You are behind a restricted proxy. Must run this pipeline on your local machine or an unrestricted server, not in a sandboxed environment. |

## Edge Cases
- If zero posts are found across all companies, the email is still sent with a "No posts today" note
- Posts older than 25 hours are excluded (25h buffer handles timezone drift for daily 8 AM runs)
- Log for each run saved at `.tmp/debrief_YYYYMMDD.log`
- `.tmp/` is gitignored — all files there are regenerated on each run
