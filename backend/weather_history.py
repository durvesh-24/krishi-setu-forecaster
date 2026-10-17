"""
Daily rainfall and temperature for every district in the price dataset, so the
price models can learn how rain moves mandi prices.

  district_coords.csv    latitude / longitude of each district (Open-Meteo geocoding)
  district_weather.csv   daily rain (mm) and max temperature per district
                         - history: NASA POWER (free, no key, ~3 days behind)
                         - last days: Open-Meteo forecast API (past days)

Prediction time uses the Open-Meteo forecast (next 16 days) via rain_for_dates().

Run:  python weather_history.py          (fills in anything missing)
"""

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta

import numpy as np
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "cleaned_combine_wsrjc.csv")
COORDS_PATH = os.path.join(BASE_DIR, "district_coords.csv")
WEATHER_PATH = os.path.join(BASE_DIR, "district_weather.csv")

HISTORY_START = date(2023, 1, 1)
GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

# Dataset spelling -> official state name used by geocoders
STATE_OFFICIAL = {
    "Chattisgarh": "Chhattisgarh",
    "Uttrakhand": "Uttarakhand",
    "NCT of Delhi": "Delhi",
    "Pondicherry": "Puducherry",
    "Kerala": "Kerala",
}

# Fallback point per state when a district can't be found
STATE_FALLBACK_CITY = {
    "Andhra Pradesh": "Vijayawada", "Bihar": "Patna", "Chattisgarh": "Raipur", "Gujarat": "Ahmedabad",
    "Haryana": "Karnal", "Karnataka": "Bengaluru", "Kerala": "Thrissur", "Madhya Pradesh": "Bhopal",
    "Maharashtra": "Pune", "Manipur": "Imphal", "Meghalaya": "Shillong", "NCT of Delhi": "New Delhi",
    "Odisha": "Bhubaneswar", "Pondicherry": "Puducherry", "Punjab": "Ludhiana", "Rajasthan": "Jaipur",
    "Tamil Nadu": "Tiruchirappalli", "Telangana": "Hyderabad", "Tripura": "Agartala",
    "Uttar Pradesh": "Lucknow", "Uttrakhand": "Dehradun", "West Bengal": "Kolkata",
    "Assam": "Guwahati", "Jharkhand": "Ranchi", "Himachal Pradesh": "Shimla", "Goa": "Panaji",
    "Jammu and Kashmir": "Srinagar", "Nagaland": "Kohima", "Mizoram": "Aizawl", "Sikkim": "Gangtok",
    "Arunachal Pradesh": "Itanagar", "Chandigarh": "Chandigarh",
}


def _get_json(url, params, retries=6, timeout=120):
    full = f"{url}?{urllib.parse.urlencode(params, doseq=True)}"
    req = urllib.request.Request(full, headers={"User-Agent": "KrishiSetu/1.0"})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as res:
                return json.load(res)
        except Exception as e:
            if attempt == retries - 1:
                raise
            limited = isinstance(e, urllib.error.HTTPError) and e.code == 429
            time.sleep(60 if limited else 3 * 2 ** attempt)


# ---------------------------------------------------------------- coordinates

# Old / dataset spellings -> names the geocoder knows
DISTRICT_ALT_NAMES = {
    "Bangalore": "Bengaluru", "Shimoga": "Shivamogga", "Gurgaon": "Gurugram", "Tarntaran": "Tarn Taran",
    "Nowarangpur": "Nabarangpur", "Mahendragarh-Narnaul": "Mahendragarh", "Imphal East": "Imphal",
    "Imphal West": "Imphal", "Belgaum": "Belagavi", "Bellary": "Ballari", "Bijapur": "Vijayapura",
    "Kalburgi": "Kalaburagi", "Mysore": "Mysuru", "Tumkur": "Tumakuru", "Chikmagalur": "Chikkamagaluru",
    "Chamrajnagar": "Chamarajanagar", "Sholapur": "Solapur", "Ahmednagar": "Ahilyanagar",
    "Vashim": "Washim", "Jalana": "Jalna", "Amarawati": "Amravati",
    "Chattrapati Sambhajinagar": "Aurangabad", "Delhi": "New Delhi", "Kamrup": "Guwahati",
    "Unokoti": "Unakoti", "Munghair": "Munger", "Singroli": "Singrauli", "Farukhabad": "Farrukhabad",
    "Panchmahals": "Panchmahal", "Gourela Pendra Marwahi": "Gaurela-Pendra-Marwahi",
    "Sounth 24 Parganas": "South 24 Parganas",
}


def _geocode(name, state):
    official = STATE_OFFICIAL.get(state, state).lower()
    try:
        data = _get_json(GEOCODE_URL, {"name": name, "count": 20, "countryCode": "IN", "language": "en"})
    except Exception:
        return None
    for r in data.get("results") or []:
        admin1 = (r.get("admin1") or "").lower()
        if admin1 and (admin1 == official or official in admin1 or admin1 in official):
            return r["latitude"], r["longitude"]
    return None


def _nominatim(name, state):
    """OpenStreetMap geocoder: knows district names the first one misses.
    Its usage policy allows at most one request per second."""
    time.sleep(1.1)
    official = STATE_OFFICIAL.get(state, state)
    try:
        data = _get_json(NOMINATIM_URL, {
            "q": f"{name} district, {official}, India", "format": "json", "limit": 1, "countrycodes": "in",
        }, retries=2, timeout=30)
    except Exception:
        return None
    return (float(data[0]["lat"]), float(data[0]["lon"])) if data else None


def _candidates(district):
    names = [district, DISTRICT_ALT_NAMES.get(district, "")]
    if "(" in district:
        outside, inside = district.split("(", 1)
        names += [outside.strip(), inside.strip(" )")]
    if "-" in district:
        names += [part.strip() for part in district.split("-")]
    return [n for n in dict.fromkeys(names) if n]


def update_coords(log=print, retry_rough=False):
    """Geocode any district that is not in district_coords.csv yet
    (retry_rough=True also retries districts that only got their state's main city)."""
    prices = pd.read_csv(CSV_PATH, usecols=["State Name", "District Name", "Market Name"])
    pairs = prices[["State Name", "District Name"]].drop_duplicates()
    coords = pd.read_csv(COORDS_PATH) if os.path.exists(COORDS_PATH) else pd.DataFrame(
        columns=["State Name", "District Name", "latitude", "longitude", "source"])
    if retry_rough and len(coords):
        coords = coords[~coords["source"].isin(["state", "missing"])]
    known = set(zip(coords["State Name"], coords["District Name"]))
    todo = [p for p in pairs.itertuples(index=False) if (p[0], p[1]) not in known]
    if not todo:
        return coords
    log(f"Geocoding {len(todo)} districts...")

    top_market = (prices.groupby(["State Name", "District Name"])["Market Name"]
                  .agg(lambda s: s.value_counts().index[0]).to_dict())

    def locate(pair):
        state, district = pair
        for name in _candidates(district):
            hit = _geocode(name, state)
            if hit:
                return hit + ("district",)
        for name in _candidates(district):
            hit = _nominatim(name, state)
            if hit:
                return hit + ("district",)
        market = top_market.get((state, district), "")
        for name in {market, market.replace("APMC", "").strip()}:
            hit = name and _geocode(name, state)
            if hit:
                return hit + ("market",)
        hit = _geocode(STATE_FALLBACK_CITY.get(state, state), state)
        return (hit + ("state",)) if hit else (np.nan, np.nan, "missing")

    results = [locate(pair) for pair in todo]  # one at a time: the geocoder has a per-minute limit
    new = pd.DataFrame([
        {"State Name": s, "District Name": d, "latitude": r[0], "longitude": r[1], "source": r[2]}
        for (s, d), r in zip(todo, results)
    ])
    coords = pd.concat([coords, new], ignore_index=True)
    coords.to_csv(COORDS_PATH, index=False)
    log(f"  located: {new['source'].value_counts().to_dict()}")
    return coords


# ---------------------------------------------------------------- rainfall

def _cell(lat, lon):
    """NASA POWER resolution is 0.5 x 0.625 degrees, so nearby districts share data."""
    return round(lat * 2) / 2, round(lon / 0.625) * 0.625


def _power_history(lat, lon, start, end):
    data = _get_json(POWER_URL, {
        "parameters": "PRECTOTCORR,T2M_MAX", "community": "AG", "format": "JSON",
        "latitude": lat, "longitude": lon,
        "start": start.strftime("%Y%m%d"), "end": end.strftime("%Y%m%d"),
    })
    p = data["properties"]["parameter"]
    df = pd.DataFrame({"rain_mm": p["PRECTOTCORR"], "tmax": p["T2M_MAX"]})
    df.index = pd.to_datetime(df.index, format="%Y%m%d")
    return df.replace(-999.0, np.nan)


def _open_meteo_daily(lat, lon, past_days=30, forecast_days=16):
    data = _get_json(FORECAST_URL, {
        "latitude": lat, "longitude": lon, "timezone": "Asia/Kolkata",
        "daily": "precipitation_sum,temperature_2m_max",
        "past_days": past_days, "forecast_days": forecast_days,
    }, timeout=60)
    d = data["daily"]
    df = pd.DataFrame({"rain_mm": d["precipitation_sum"], "tmax": d["temperature_2m_max"]},
                      index=pd.to_datetime(d["time"]))
    return df.astype(float)


def update_weather(log=print):
    """Bring district_weather.csv up to yesterday for every district."""
    coords = update_coords(log=log).dropna(subset=["latitude", "longitude"])
    coords["cell"] = [_cell(a, b) for a, b in zip(coords["latitude"], coords["longitude"])]

    existing = pd.read_csv(WEATHER_PATH, parse_dates=["date"]) if os.path.exists(WEATHER_PATH) else None
    end = date.today() - timedelta(days=1)
    have_cells = {}
    if existing is not None and len(existing):
        # a cell only needs data from the earliest date any of its districts is missing
        span = existing.groupby(["State Name", "District Name"])["date"].agg(["min", "max"])
        for state, district, cell in zip(coords["State Name"], coords["District Name"], coords["cell"]):
            if (state, district) not in span.index or span.loc[(state, district), "min"].date() > HISTORY_START:
                start = HISTORY_START  # new district, or its history is incomplete
            else:
                start = (span.loc[(state, district), "max"] - pd.Timedelta(days=10)).date()
            have_cells[cell] = min(have_cells.get(cell, start), start)

    cells = sorted(set(coords["cell"]))
    log(f"Fetching rainfall for {len(cells)} weather cells...")

    def fetch(cell):
        try:
            return _fetch(cell)
        except Exception as e:  # skip this cell now; the next update fills it in
            log(f"  skipped cell {cell}: {e}")
            return cell, None

    def _fetch(cell):
        start = max(HISTORY_START, have_cells.get(cell, HISTORY_START))
        df = _power_history(cell[0], cell[1], start, end)
        missing = df["rain_mm"].isna()
        if missing.any():  # most recent days: take Open-Meteo instead
            recent = _open_meteo_daily(cell[0], cell[1], past_days=30, forecast_days=1)
            df = df.combine_first(recent.loc[recent.index <= pd.Timestamp(end)])
        return cell, df

    frames = {}
    with ThreadPoolExecutor(max_workers=2) as pool:
        for i, (cell, df) in enumerate(pool.map(fetch, cells), 1):
            if df is not None:
                frames[cell] = df
            if i % 50 == 0:
                log(f"  {i}/{len(cells)} cells")

    rows = []
    for state, district, cell in zip(coords["State Name"], coords["District Name"], coords["cell"]):
        df = frames.get(cell)
        if df is None:
            continue
        part = df.rename_axis("date").reset_index()
        part.insert(0, "District Name", district)
        part.insert(0, "State Name", state)
        rows.append(part)
    fresh = pd.concat(rows, ignore_index=True)

    if existing is not None:
        fresh = pd.concat([existing, fresh]).drop_duplicates(["State Name", "District Name", "date"], keep="last")
    fresh = fresh.sort_values(["State Name", "District Name", "date"])
    fresh["rain_mm"] = fresh["rain_mm"].clip(lower=0).round(2)
    fresh["tmax"] = fresh["tmax"].round(2)
    fresh.to_csv(WEATHER_PATH, index=False, date_format="%Y-%m-%d")
    log(f"Weather saved: {len(fresh)} rows, up to {fresh['date'].max().date()}")
    return fresh


def load_weather():
    if not os.path.exists(WEATHER_PATH):
        return None
    return pd.read_csv(WEATHER_PATH, parse_dates=["date"])


def load_coords():
    if not os.path.exists(COORDS_PATH):
        return {}
    c = pd.read_csv(COORDS_PATH).dropna(subset=["latitude", "longitude"])
    return {(s, d): (lat, lon) for s, d, lat, lon in
            c[["State Name", "District Name", "latitude", "longitude"]].itertuples(index=False)}


def forecast_daily(lat, lon):
    """Last 30 days + next 16 days of rain / max temperature for one place."""
    return _open_meteo_daily(lat, lon, past_days=30, forecast_days=16)


if __name__ == "__main__":
    update_weather()
