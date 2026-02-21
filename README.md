# Ai-Current-Debrief

A Python tool that scrapes recent LinkedIn posts from leading AI companies, summarizes them with Claude, and emails you a daily briefing via Resend.

## How it works

1. Authenticates with LinkedIn (unofficial API)
2. Fetches recent posts from tracked AI companies
3. Passes the posts to Claude (Anthropic) for summarization
4. Sends a formatted briefing email via Resend

## Tracked companies

OpenAI, Anthropic, Google DeepMind, Meta AI, Microsoft, Mistral AI, xAI, Cohere, Hugging Face, Stability AI.

Edit `AI_COMPANIES` in `linkedin_scraper.py` to add or remove companies.

---

## Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd Ai-Current-Debrief
pip install -r requirements.txt
```

### 2. Create your .env file

```bash
cp .env.example .env
```

Then open `.env` and fill in every value:

| Variable | Where to get it |
|---|---|
| `LINKEDIN_EMAIL` | Your LinkedIn login email |
| `LINKEDIN_PASSWORD` | Your LinkedIn password |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com/ |
| `RESEND_API_KEY` | https://resend.com/api-keys |
| `SENDER_EMAIL` | A domain verified in your Resend account |
| `RECIPIENT_EMAIL` | Where you want the briefing delivered |

> **Note on `SENDER_EMAIL`:** Resend requires you to verify a sending domain. If you just want to test quickly, Resend's free tier allows sending from `onboarding@resend.dev` — just set that as your `SENDER_EMAIL`.

### 3. Run

```bash
python main.py
```

---

## Scheduling (optional)

To run automatically every morning, add a cron job:

```bash
# Run at 7:00 AM every day
0 7 * * * cd /path/to/Ai-Current-Debrief && python main.py >> briefing.log 2>&1
```

---

## Troubleshooting

**No posts found**
- Confirm your LinkedIn credentials are correct in `.env`
- LinkedIn may rate-limit or challenge logins from new IPs — try running once manually first

**Email not received**
- Check that `SENDER_EMAIL` uses a domain verified in Resend
- Check your spam folder

**Missing env variable error**
- Make sure you copied `.env.example` to `.env` (not `.env.example`) and filled in all values
