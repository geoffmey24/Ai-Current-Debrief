"""
run_daily_debrief.py
--------------------
Orchestrator — runs the full daily debrief pipeline in order:
  1. scrape_linkedin_posts.py
  2. extract_insights.py
  3. generate_summary.py
  4. send_email.py

Logs to .tmp/debrief_YYYYMMDD.log and stdout.
Run via cron at 8 AM:
  0 8 * * * cd /home/user/Ai-Current-Debrief && python3 execution/run_daily_debrief.py >> .tmp/cron.log 2>&1
"""

import logging
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# ---------------------------------------------------------------------------
# Logging — both file and stdout
# ---------------------------------------------------------------------------

Path(".tmp").mkdir(exist_ok=True)
DATE_STR  = datetime.now().strftime("%Y%m%d")
LOG_FILE  = Path(f".tmp/debrief_{DATE_STR}.log")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Pipeline steps
# ---------------------------------------------------------------------------

STEPS = [
    ("execution/scrape_linkedin_posts.py", "Scrape LinkedIn posts"),
    ("execution/extract_insights.py",      "Extract insights (Claude API)"),
    ("execution/generate_summary.py",      "Generate executive summary"),
    ("execution/send_email.py",            "Send email"),
]


def run_step(script: str, description: str):
    """Run a script as a subprocess. Raises RuntimeError on failure."""
    log.info(f"▶  {description}")
    result = subprocess.run(
        [sys.executable, script],
        capture_output=True,
        text=True,
    )
    if result.stdout.strip():
        for line in result.stdout.strip().splitlines():
            log.info(f"   {line}")
    if result.returncode != 0:
        log.error(f"✗  {description} failed (exit {result.returncode})")
        if result.stderr.strip():
            for line in result.stderr.strip().splitlines():
                log.error(f"   {line}")
        raise RuntimeError(f"{description} failed — see log for details.")
    log.info(f"✓  {description}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    log.info("=" * 55)
    log.info(f"AI Daily Debrief — {datetime.now().strftime('%B %d, %Y %H:%M')}")
    log.info("=" * 55)

    for script, description in STEPS:
        try:
            run_step(script, description)
        except RuntimeError as e:
            log.error(f"\nPipeline aborted: {e}")
            sys.exit(1)

    log.info("=" * 55)
    log.info("Pipeline complete. Check your inbox!")
    log.info("=" * 55)


if __name__ == "__main__":
    main()
