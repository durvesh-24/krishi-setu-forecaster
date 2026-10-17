"""
Download new mandi prices from Agmarknet (via the official data.gov.in API)
and append them to cleaned_combine_wsrjc.csv.

Source: "Variety-wise Daily Market Prices Data of Commodity"
https://www.data.gov.in/resource/variety-wise-daily-market-prices-data-commodity

Needs a free data.gov.in API key in DATA_GOV_API_KEY (.env). Without one the
public demo key is used, which only returns 10 rows per request and is
rate-limited, so it is only good for testing.

Run:  python agmarknet_sync.py            (from the last date in the CSV to today)
      python agmarknet_sync.py --from 2025-10-01
"""

import argparse
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta

import pandas as pd
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "cleaned_combine_wsrjc.csv")

load_dotenv(os.path.join(BASE_DIR, ".env"))
load_dotenv(os.path.join(BASE_DIR, "..", ".env"))

API_URL = "https://api.data.gov.in/resource/35985678-0d79-46b4-9ed6-6f13308a1d24"
DEMO_KEY = "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b"
PAGE_SIZE = 1000
OVERLAP_DAYS = 3  # mandis sometimes upload a few days late
WORKERS = 4  # parallel requests; keep small to be polite to the API

# Agmarknet commodity name -> name used in our dataset / models
COMMODITIES = {
    "Wheat": "Wheat",
    "Rice": "Rice",
    "Jowar(Sorghum)": "Jowar",
    "Cotton": "Cotton",
    "Sugarcane": "Sugarcane",
}

# Keep state names identical to the existing dataset so series don't split
STATE_ALIASES = {
    "Chhattisgarh": "Chattisgarh",
    "Uttarakhand": "Uttrakhand",
    "Keralam": "Kerala",
    "Delhi": "NCT of Delhi",
    "Puducherry": "Pondicherry",
}

COLUMNS = [
    "State Name", "District Name", "Market Name", "Commodity",
    "MSP (Rs./Quintal)", "Modal Price (Rs./Quintal)", "day", "month", "year",
]


def api_key():
    return os.getenv("DATA_GOV_API_KEY") or DEMO_KEY


def _get(params, retries=6):
    # Built-in urllib: some requests/urllib3 builds hang on this server
    url = f"{API_URL}?{urllib.parse.urlencode(params)}"
    request = urllib.request.Request(url, headers={"User-Agent": "KrishiSetu/1.0"})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(request, timeout=60) as res:
                data = json.load(res)
            if "records" not in data:
                raise ValueError(data.get("error") or data.get("message") or "No records in response")
            return data
        except (urllib.error.URLError, TimeoutError, ValueError) as e:
            if attempt == retries - 1:
                raise RuntimeError(f"data.gov.in request failed: {e}") from e
            # 429 = rate limited: back off longer
            wait = 60 if isinstance(e, urllib.error.HTTPError) and e.code == 429 else 5 * 2 ** attempt
            time.sleep(min(120, wait))


def _fetch_day(commodity, day):
    """All records for one commodity on one day. Paging order is not stable on
    this API, so pages are re-read until every record has been seen."""
    params = {
        "api-key": api_key(),
        "format": "json",
        "limit": PAGE_SIZE,
        "offset": 0,
        "filters[Commodity]": commodity,
        "filters[Arrival_Date]": day.strftime("%d-%m-%Y"),
        "sort[Market]": "asc",
    }
    unique, total = {}, None
    for _ in range(3):
        params["offset"] = 0
        while True:
            data = _get(params)
            batch = data["records"]
            total = int(data.get("total") or 0)
            for r in batch:
                unique[tuple(sorted(r.items()))] = r
            params["offset"] += len(batch)
            if not batch or params["offset"] >= total:
                break
        if len(unique) >= total:
            break
    return list(unique.values())


def fetch_commodity(commodity, start, end, log=print):
    """All records for one commodity between two dates (inclusive), a few days in parallel."""
    days = [start + timedelta(days=i) for i in range((end - start).days + 1)]
    records = []
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        for day, batch in zip(days, pool.map(lambda d: _fetch_day(commodity, d), days)):
            records.extend(batch)
            if day.day == 1 or day == end:
                log(f"  {commodity}: up to {day} -> {len(records)} records")
    return records


# Official renames / spellings used by Agmarknet 2.0 -> names in the existing dataset
DISTRICT_ALIASES = {
    ("Maharashtra", "Ahilyanagar"): "Ahmednagar",
    ("Maharashtra", "Solapur"): "Sholapur",
    ("Maharashtra", "Osmanabad"): "Dharashiv(Usmanabad)",
    ("Maharashtra", "Jalna"): "Jalana",
    ("Maharashtra", "Washim"): "Vashim",
    ("Maharashtra", "Amravati"): "Amarawati",
    ("Maharashtra", "Aurangabad"): "Chattrapati Sambhajinagar",
    ("Maharashtra", "Chhatrapati Sambhajinagar"): "Chattrapati Sambhajinagar",
    ("Karnataka", "Belagavi"): "Belgaum",
    ("Karnataka", "Bengaluru"): "Bangalore",
    ("Karnataka", "Bengaluru Urban"): "Bangalore",
    ("Karnataka", "Kalaburagi"): "Kalburgi",
    ("Karnataka", "Ballari"): "Bellary",
    ("Karnataka", "Vijayapura"): "Bijapur",
    ("Karnataka", "Shivamogga"): "Shimoga",
    ("Karnataka", "Tumakuru"): "Tumkur",
    ("Karnataka", "Mysuru"): "Mysore",
    ("Karnataka", "Chikkamagaluru"): "Chikmagalur",
    ("Karnataka", "Chamarajanagar"): "Chamrajnagar",
    ("Karnataka", "Uttara Kannada"): "Karwar(Uttar Kannad)",
    ("Karnataka", "Dakshina Kannada"): "Mangalore(Dakshin Kannad)",
    ("Karnataka", "Yadgir"): "Yadgiri",
    ("Karnataka", "Davanagere"): "Davangere",
}


def _norm(name):
    return "".join(ch for ch in name.lower() if ch.isalpha())


def district_lookup(path=CSV_PATH):
    """(state, normalised name) -> district name already used in the dataset.
    "Dharashiv(Usmanabad)" is reachable as both "Dharashiv" and "Usmanabad"."""
    df = pd.read_csv(path, usecols=["State Name", "District Name"]).drop_duplicates()
    lookup = {}
    for state, district in df.itertuples(index=False):
        lookup.setdefault((state, _norm(district)), district)
        if "(" in district:
            outside, inside = district.split("(", 1)
            lookup.setdefault((state, _norm(outside)), district)
            lookup.setdefault((state, _norm(inside)), district)
    return lookup


def canonical_district(state, district, lookup):
    alias = DISTRICT_ALIASES.get((state, district))
    if alias:
        return alias
    return lookup.get((state, _norm(district)), district)


def to_rows(records, our_name, lookup):
    rows = []
    for r in records:
        try:
            d = datetime.strptime(r["Arrival_Date"], "%d/%m/%Y")
            modal = float(r["Modal_Price"])
            low = float(r.get("Min_Price") or 0)
        except (KeyError, ValueError):
            continue
        if modal <= 0:
            continue
        state = r.get("State", "").strip()
        state = STATE_ALIASES.get(state, state)
        rows.append({
            "State Name": state,
            "District Name": canonical_district(state, r.get("District", "").strip(), lookup),
            "Market Name": r.get("Market", "").strip(),
            "Commodity": our_name,
            "MSP (Rs./Quintal)": low,
            "Modal Price (Rs./Quintal)": modal,
            "day": d.day,
            "month": d.month,
            "year": d.year,
        })
    return rows


def _fmt(v):
    return str(int(v)) if float(v).is_integer() else str(v)


def last_date_in_csv(path=CSV_PATH):
    df = pd.read_csv(path, usecols=["day", "month", "year"])
    return pd.to_datetime(df[["year", "month", "day"]]).max().date()


def append_rows(rows, path=CSV_PATH):
    """Append rows in the CSV's existing format and drop exact duplicate lines."""
    with open(path, "rb") as f:
        existing = f.read().split(b"\n")
    seen = {line.rstrip(b"\r") for line in existing}
    new_lines = []
    for r in rows:
        line = ",".join(
            _fmt(r[c]) if c in ("MSP (Rs./Quintal)", "Modal Price (Rs./Quintal)") else
            (f'"{r[c]}"' if isinstance(r[c], str) and "," in r[c] else str(r[c]))
            for c in COLUMNS
        ).encode("utf-8")
        if line not in seen:
            seen.add(line)
            new_lines.append(line)

    if new_lines:
        while existing and existing[-1] == b"":
            existing.pop()
        with open(path, "wb") as f:
            f.write(b"\n".join(existing + new_lines))
    return len(new_lines)


def sync(start=None, end=None, log=print):
    """Fetch new records and append them. Returns a summary dict."""
    end = end or date.today()
    start = start or (last_date_in_csv() - timedelta(days=OVERLAP_DAYS))
    if api_key() == DEMO_KEY:
        log("Using the public demo key (10 rows per request, rate-limited). Set DATA_GOV_API_KEY for full downloads.")
    log(f"Fetching Agmarknet prices from {start} to {end}")

    lookup = district_lookup()
    all_rows, per_commodity = [], {}
    for agm_name, our_name in COMMODITIES.items():
        records = fetch_commodity(agm_name, start, end, log=log)
        rows = to_rows(records, our_name, lookup)
        per_commodity[our_name] = len(rows)
        all_rows.extend(rows)
        log(f"  {our_name}: {len(rows)} records")

    added = append_rows(all_rows)
    known = {(st, d) for (st, _), d in lookup.items()}
    new_districts = sorted({f"{r['District Name']} ({r['State Name']})" for r in all_rows
                            if (r["State Name"], r["District Name"]) not in known})
    if new_districts:
        log(f"Districts not in the old data ({len(new_districts)}): {', '.join(new_districts)}")
    summary = {
        "from": str(start),
        "to": str(end),
        "downloaded": len(all_rows),
        "added": added,
        "per_commodity": per_commodity,
        "new_districts": new_districts,
        "data_end": str(last_date_in_csv()),
    }
    log(f"Added {added} new rows; dataset now ends on {summary['data_end']}")
    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--from", dest="start", help="start date YYYY-MM-DD (default: last date in CSV)")
    parser.add_argument("--to", dest="end", help="end date YYYY-MM-DD (default: today)")
    args = parser.parse_args()
    sync(
        start=date.fromisoformat(args.start) if args.start else None,
        end=date.fromisoformat(args.end) if args.end else None,
    )
