"""
scheduler.py
------------
Runs the daily debrief pipeline every day at 08:00 local time.
Start this once and leave it running in the background:

    nohup python3 execution/scheduler.py > .tmp/scheduler.log 2>&1 &

To stop it:
    kill $(cat .tmp/scheduler.pid)
"""

import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

import schedule

BASE_DIR = Path(__file__).parent.parent
LOG_PATH = BASE_DIR / ".tmp" / "scheduler.log"
PID_PATH = BASE_DIR / ".tmp" / "scheduler.pid"


def log(msg: str):
    ts   = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line, flush=True)


def job():
    log("Triggering daily debrief pipeline …")
    result = subprocess.run(
        [sys.executable, str(BASE_DIR / "execution" / "run_daily_debrief.py")],
        cwd=str(BASE_DIR),
    )
    if result.returncode == 0:
        log("Pipeline finished successfully.")
    else:
        log(f"Pipeline exited with code {result.returncode}. Check .tmp/debrief_*.log for details.")


def main():
    BASE_DIR.joinpath(".tmp").mkdir(exist_ok=True)
    PID_PATH.write_text(str(os.getpid()))
    log(f"Scheduler started (PID {os.getpid()}). Will run pipeline daily at 08:00.")

    schedule.every().day.at("08:00").do(job)

    while True:
        schedule.run_pending()
        time.sleep(30)  # check every 30 seconds


if __name__ == "__main__":
    main()
