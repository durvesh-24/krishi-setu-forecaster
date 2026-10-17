import openmeteo_requests
import pandas as pd
import requests_cache
from retry_requests import retry

cache_session = requests_cache.CachedSession(".cache", expire_after=3600)
retry_session = retry(cache_session, retries=5, backoff_factor=0.2)
openmeteo = openmeteo_requests.Client(session=retry_session)

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

CURRENT_VARS = ["temperature_2m", "rain", "wind_speed_10m", "relative_humidity_2m", "weather_code"]
DAILY_VARS = [
    "temperature_2m_max",
    "temperature_2m_min",
    "precipitation_sum",
    "rain_sum",
    "weather_code",
    "precipitation_probability_max",
]


def get_location(city):
    """
    Look up a place name with the Open-Meteo geocoding API (India first).
    Returns (latitude, longitude, display name) or None if not found.
    """
    for params in (
        {"name": city, "count": 1, "language": "en", "countryCode": "IN"},
        {"name": city, "count": 1, "language": "en"},
    ):
        res = retry_session.get(GEOCODING_URL, params=params, timeout=10)
        res.raise_for_status()
        results = res.json().get("results") or []
        if results:
            r = results[0]
            name = ", ".join(x for x in (r.get("name"), r.get("admin1"), r.get("country")) if x)
            return r["latitude"], r["longitude"], name
    return None


def weather_forecast(city=None, latitude=None, longitude=None):
    if latitude is not None and longitude is not None:
        name = city or f"{latitude:.2f}, {longitude:.2f}"
    else:
        location = get_location(city or "Mumbai")
        if location is None:
            raise ValueError(f"Could not find a place called '{city}'")
        latitude, longitude, name = location

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "daily": DAILY_VARS,
        "current": CURRENT_VARS,
        "timezone": "auto",
        "past_days": 0,
        "forecast_days": 8,
    }
    response = openmeteo.weather_api(FORECAST_URL, params=params)[0]

    # Current weather
    current = response.Current()
    current_weather = {"time": current.Time()}
    for i, var in enumerate(CURRENT_VARS):
        current_weather[var] = float(current.Variables(i).Value())

    # Daily weather
    # Daily timestamps are local midnight expressed in UTC, so shift by the
    # location's offset before formatting (otherwise dates are a day early in India)
    daily = response.Daily()
    offset = response.UtcOffsetSeconds()
    daily_dates = pd.date_range(
        start=pd.to_datetime(daily.Time() + offset, unit="s", utc=True),
        end=pd.to_datetime(daily.TimeEnd() + offset, unit="s", utc=True),
        freq=pd.Timedelta(seconds=daily.Interval()),
        inclusive="left",
    ).strftime("%Y-%m-%d").tolist()
    values = {var: daily.Variables(i).ValuesAsNumpy() for i, var in enumerate(DAILY_VARS)}
    daily_data = [
        {"date": daily_dates[i], **{var: float(values[var][i]) for var in DAILY_VARS}}
        for i in range(len(daily_dates))
    ]

    return {
        "location": {
            "name": name,
            "latitude": response.Latitude(),
            "longitude": response.Longitude(),
            "elevation": response.Elevation(),
            "timezone": response.Timezone(),
            "timezone_abbreviation": response.TimezoneAbbreviation(),
        },
        "current": current_weather,
        "daily": daily_data,
    }
