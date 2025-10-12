import openmeteo_requests
import pandas as pd
import requests_cache
from retry_requests import retry

# Optionally, use a geocoding API to get lat/lon from city name
def get_lat_lon(city):
    city_map = {
        "berlin": (52.52, 13.41),
        "delhi": (28.61, 77.21),
        "mumbai": (19.07, 72.87),
        "new york": (40.71, -74.01)
    }
    return city_map.get(city.lower(), (52.52, 13.41))  # default: Berlin

def weather_forecast(city):
    latitude, longitude = get_lat_lon(city)
    cache_session = requests_cache.CachedSession('.cache', expire_after=3600)
    retry_session = retry(cache_session, retries=5, backoff_factor=0.2)
    openmeteo = openmeteo_requests.Client(session=retry_session)

    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "daily": ["temperature_2m_max", "temperature_2m_min", "precipitation_sum", "rain_sum"],
        "current": ["temperature_2m", "rain", "wind_speed_10m"],
        "timezone": "auto",
        "past_days": 0,
        "forecast_days": 8,
    }
    responses = openmeteo.weather_api(url, params=params)
    response = responses[0]

    # Current weather
    current = response.Current()
    current_weather = {
        "time": current.Time(),
        "temperature_2m": current.Variables(0).Value(),
        "rain": current.Variables(1).Value(),
        "wind_speed_10m": current.Variables(2).Value()
    }

    # Daily weather
    daily = response.Daily()
    daily_dates = pd.date_range(
        start=pd.to_datetime(daily.Time(), unit="s", utc=True),
        end=pd.to_datetime(daily.TimeEnd(), unit="s", utc=True),
        freq=pd.Timedelta(seconds=daily.Interval()),
        inclusive="left"
    ).strftime('%Y-%m-%d').tolist()
    daily_data = []
    max_temps = daily.Variables(0).ValuesAsNumpy()
    min_temps = daily.Variables(1).ValuesAsNumpy()
    precipitation = daily.Variables(3).ValuesAsNumpy()
    rain = daily.Variables(3).ValuesAsNumpy()
    for i in range(len(daily_dates)):
        daily_data.append({
            "date": daily_dates[i],
            "temperature_2m_max": float(max_temps[i]),
            "temperature_2m_min": float(min_temps[i]),
            "precipitation_sum": float(precipitation[i]),
            "rain_sum": float(rain[i])
        })

    return {
        "location": {
            "latitude": response.Latitude(),
            "longitude": response.Longitude(),
            "elevation": response.Elevation(),
            "timezone": response.Timezone(),
            "timezone_abbreviation": response.TimezoneAbbreviation()
        },
        "current": current_weather,
        "daily": daily_data
    }