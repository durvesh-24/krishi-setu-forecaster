import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  CloudSnow,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { STATE_CITY } from "@/data/indian_states";
import type { TranslationKey } from "@/i18n/translations";
import type { Farmer } from "@/lib/user";

export interface WeatherData {
  location: { name: string; latitude: number; longitude: number; timezone: string };
  current: {
    temperature_2m: number;
    rain: number;
    wind_speed_10m: number;
    relative_humidity_2m: number;
    weather_code: number;
  };
  daily: {
    date: string;
    temperature_2m_max: number;
    temperature_2m_min: number;
    precipitation_sum: number;
    rain_sum: number;
    weather_code: number;
    precipitation_probability_max: number;
  }[];
}

export type WeatherQuery = { city: string } | { latitude: number; longitude: number; city?: string };

const LOCATION_KEY = "krishisetu-weather-location";

export const fetchWeather = async (query: WeatherQuery) => {
  const res = await api.post<{ weather_forecast: WeatherData }>("/weather", query);
  return res.data.weather_forecast;
};

export const savedWeatherQuery = (farmer: Farmer | null): WeatherQuery => {
  try {
    const raw = localStorage.getItem(LOCATION_KEY);
    if (raw) return JSON.parse(raw) as WeatherQuery;
  } catch {
    // ignore
  }
  return { city: (farmer && STATE_CITY[farmer.state]) || farmer?.state || "Pune" };
};

export const saveWeatherQuery = (query: WeatherQuery) => {
  try {
    localStorage.setItem(LOCATION_KEY, JSON.stringify(query));
  } catch {
    // ignore
  }
};

/** WMO weather code -> label key + icon. */
export const describeWeather = (code: number): { key: TranslationKey; icon: LucideIcon; tone: string } => {
  if (code === 0) return { key: "weather.c.clear", icon: Sun, tone: "text-tone-amber" };
  if (code <= 2) return { key: "weather.c.partly", icon: CloudSun, tone: "text-tone-amber" };
  if (code === 3) return { key: "weather.c.cloudy", icon: Cloud, tone: "text-muted-foreground" };
  if (code <= 48) return { key: "weather.c.fog", icon: CloudFog, tone: "text-muted-foreground" };
  if (code <= 57) return { key: "weather.c.drizzle", icon: CloudDrizzle, tone: "text-tone-sky" };
  if (code <= 67) return { key: "weather.c.rain", icon: CloudRain, tone: "text-tone-sky" };
  if (code <= 77 || code === 85 || code === 86) return { key: "weather.c.snow", icon: CloudSnow, tone: "text-tone-sky" };
  if (code <= 82) return { key: "weather.c.showers", icon: CloudRain, tone: "text-tone-sky" };
  return { key: "weather.c.storm", icon: CloudLightning, tone: "text-tone-violet" };
};

/** Simple farming advice from today's numbers. */
export const farmingTips = (w: WeatherData): TranslationKey[] => {
  const today = w.daily[0];
  const tips: TranslationKey[] = [];
  const maxTemp = Math.max(w.current.temperature_2m, today?.temperature_2m_max ?? -99);

  if (maxTemp >= 35) tips.push("tip.heat");
  if (w.current.wind_speed_10m >= 20) tips.push("tip.wind");
  if ((today?.precipitation_probability_max ?? 0) >= 60 || w.current.rain > 0) tips.push("tip.rain");
  if (w.current.relative_humidity_2m >= 80) tips.push("tip.humid");
  if ((today?.temperature_2m_min ?? 99) <= 10) tips.push("tip.cold");
  if (tips.length === 0) tips.push("tip.good");
  if (!tips.includes("tip.rain")) tips.push("tip.irrigation");
  return tips;
};
