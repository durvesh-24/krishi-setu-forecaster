"""
Bring the price forecasting up to date in one step:

  1. download new mandi prices from Agmarknet (agmarknet_sync.py)
  2. download new district rainfall (weather_history.py)
  3. retrain the per-commodity XGBoost price models if new prices arrived
  4. optionally rebuild dataset/KrishiSetu_Dataset.xlsx

Run:  python update_prices.py                 (from the last date in the data to today)
      python update_prices.py --from 2025-10-15 --excel
      python update_prices.py --retrain-only

The API server also runs steps 1-2 automatically once a day (see main.py).
"""

import argparse
import os
import subprocess
import sys
from datetime import date

import agmarknet_sync
import train_price_model
import weather_history

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def update(start=None, end=None, retrain_only=False, excel=False, log=print):
    summary = {}
    if not retrain_only:
        summary["sync"] = agmarknet_sync.sync(start=start, end=end, log=log)

    if not retrain_only:
        try:
            weather_history.update_weather(log=log)
        except Exception as e:  # prices still update; rain fills in next time
            log(f"Weather update failed: {e}")

    if retrain_only or summary["sync"]["added"] > 0:
        log("Retraining price models...")
        summary["training"] = train_price_model.train(verbose=False)
        for commodity, m in summary["training"]["commodities"].items():
            log(f"  {commodity}: {m.get('days_of_prices')} days, MAE Rs. {m.get('mae', '-')}, "
                f"MAPE {m.get('mape_percent', '-')}%, baseline MAE Rs. {m.get('baseline_mae', '-')}")
    else:
        log("No new rows, models left as they are.")

    if excel:
        log("Rebuilding dataset/KrishiSetu_Dataset.xlsx...")
        subprocess.run([sys.executable, os.path.join(BASE_DIR, "scripts", "export_dataset.py")], check=True)
    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--from", dest="start", help="start date YYYY-MM-DD (default: last date in the data)")
    parser.add_argument("--to", dest="end", help="end date YYYY-MM-DD (default: today)")
    parser.add_argument("--retrain-only", action="store_true", help="skip downloading, just retrain")
    parser.add_argument("--excel", action="store_true", help="also rebuild the Excel workbook")
    args = parser.parse_args()
    update(
        start=date.fromisoformat(args.start) if args.start else None,
        end=date.fromisoformat(args.end) if args.end else None,
        retrain_only=args.retrain_only,
        excel=args.excel,
    )
