import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Droplets, Lightbulb, LocateFixed, MapPin, Search, Umbrella, Wind } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/i18n/context";
import { apiErrorMessage } from "@/lib/api";
import { getFarmer } from "@/lib/user";
import {
  describeWeather,
  farmingTips,
  fetchWeather,
  savedWeatherQuery,
  saveWeatherQuery,
  type WeatherQuery,
} from "@/lib/weather";
import axios from "axios";

const Weather = () => {
  const { t, locale } = useTranslation();
  const { toast } = useToast();
  const [query, setQuery] = useState<WeatherQuery>(() => savedWeatherQuery(getFarmer()));
  const [search, setSearch] = useState("");
  const [locating, setLocating] = useState(false);

  const { data: weather, isLoading, error, refetch } = useQuery({
    queryKey: ["weather", query],
    queryFn: () => fetchWeather(query),
    staleTime: 15 * 60 * 1000,
    retry: (count, err) => !(axios.isAxiosError(err) && err.response?.status === 404) && count < 1,
  });

  const changeQuery = (next: WeatherQuery) => {
    setQuery(next);
    saveWeatherQuery(next);
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) changeQuery({ city: search.trim() });
  };

  const locateMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        changeQuery({
          latitude: Number(pos.coords.latitude.toFixed(3)),
          longitude: Number(pos.coords.longitude.toFixed(3)),
          city: t("weather.myLocation"),
        });
      },
      () => {
        setLocating(false);
        toast({ title: t("weather.title"), description: t("weather.locationDenied"), variant: "destructive" });
      },
      { timeout: 10000 },
    );
  };

  const notFound = axios.isAxiosError(error) && error.response?.status === 404;
  const condition = weather ? describeWeather(weather.current.weather_code) : null;

  const dayLabel = (date: string, index: number) => {
    if (index === 0) return t("weather.today");
    if (index === 1) return t("weather.tomorrow");
    return new Date(`${date}T00:00:00`).toLocaleDateString(locale, { weekday: "short", day: "numeric" });
  };

  return (
    <PageLayout title={t("weather.title")}>
      {/* Search */}
      <form onSubmit={onSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("weather.search")}
            className="h-11 pl-9"
          />
        </div>
        <Button type="submit" className="h-11">
          {t("weather.go")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0"
          onClick={locateMe}
          disabled={locating}
          aria-label={t("weather.useLocation")}
          title={t("weather.useLocation")}
        >
          <LocateFixed className={locating ? "h-5 w-5 animate-pulse" : "h-5 w-5"} />
        </Button>
      </form>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-56 rounded-3xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      ) : error || !weather || !condition ? (
        <div className="card-elevated space-y-3 p-6 text-center">
          <p className="text-muted-foreground">
            {notFound ? t("weather.notFound") : apiErrorMessage(error, "") || t("common.serverError")}
          </p>
          {!notFound && (
            <Button variant="outline" onClick={() => refetch()}>
              {t("common.retry")}
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Current weather */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 to-indigo-700 p-6 text-white shadow-lg dark:from-sky-900 dark:to-indigo-950"
          >
            <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <p className="flex items-center gap-1.5 text-sm text-white/80">
              <MapPin className="h-4 w-4" />
              {weather.location.name}
            </p>
            <div className="mt-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-6xl font-extrabold tracking-tight">
                  {Math.round(weather.current.temperature_2m)}°
                </p>
                <p className="mt-1 text-lg text-white/90">{t(condition.key)}</p>
                {weather.daily[0] && (
                  <p className="text-sm text-white/70">
                    {Math.round(weather.daily[0].temperature_2m_max)}° / {Math.round(weather.daily[0].temperature_2m_min)}°
                  </p>
                )}
              </div>
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 4 }}>
                <condition.icon className="h-24 w-24 text-white/90" strokeWidth={1.5} />
              </motion.div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2 text-center text-sm">
              {[
                { icon: Droplets, label: t("weather.humidity"), value: `${Math.round(weather.current.relative_humidity_2m)}%` },
                { icon: Wind, label: t("weather.wind"), value: `${weather.current.wind_speed_10m.toFixed(0)} km/h` },
                { icon: Umbrella, label: t("weather.rain"), value: `${weather.current.rain.toFixed(1)} mm` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-xl bg-white/15 px-2 py-3 backdrop-blur">
                  <Icon className="mx-auto h-4 w-4 text-white/80" />
                  <p className="mt-1 font-semibold">{value}</p>
                  <p className="text-xs text-white/70">{label}</p>
                </div>
              ))}
            </div>
          </motion.section>

          {/* 7-day forecast */}
          <section className="card-elevated p-5">
            <h3 className="mb-3 font-semibold">{t("weather.forecast")}</h3>
            <ul className="divide-y">
              {weather.daily.slice(0, 7).map((day, index) => {
                const c = describeWeather(day.weather_code);
                return (
                  <li key={day.date} className="flex items-center gap-3 py-3">
                    <span className="w-24 shrink-0 text-sm font-medium">{dayLabel(day.date, index)}</span>
                    <c.icon className={`h-6 w-6 shrink-0 ${c.tone}`} />
                    <span className="hidden flex-1 truncate text-sm text-muted-foreground sm:block">{t(c.key)}</span>
                    <span className="flex flex-1 items-center gap-1 text-xs text-tone-sky sm:flex-none sm:w-20">
                      <Droplets className="h-3.5 w-3.5" />
                      {Math.round(day.precipitation_probability_max)}%
                    </span>
                    <span className="w-20 text-right text-sm">
                      <span className="font-semibold">{Math.round(day.temperature_2m_max)}°</span>
                      <span className="ml-2 text-muted-foreground">{Math.round(day.temperature_2m_min)}°</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Farming tips */}
          <section className="card-elevated p-5">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Lightbulb className="h-5 w-5 text-tone-amber" /> {t("weather.tips")}
            </h3>
            <ul className="space-y-2">
              {farmingTips(weather).map((tip) => (
                <li key={tip} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {t(tip)}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </PageLayout>
  );
};

export default Weather;
