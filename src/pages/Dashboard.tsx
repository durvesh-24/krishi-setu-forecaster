import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Bug,
  ChevronRight,
  CloudRain,
  CloudSun,
  Droplets,
  Lightbulb,
  LineChart,
  MapPin,
  Sprout,
  Wind,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/i18n/context";
import type { TranslationKey } from "@/i18n/translations";
import { getFarmer } from "@/lib/user";
import { describeWeather, farmingTips, fetchWeather, savedWeatherQuery } from "@/lib/weather";

const ACTIONS: {
  path: string;
  title: TranslationKey;
  desc: TranslationKey;
  icon: typeof Sprout;
  tone: string;
}[] = [
  { path: "/crop-recommendation", title: "dash.crop", desc: "dash.cropDesc", icon: Sprout, tone: "text-tone-green bg-tone-green/15" },
  { path: "/weather", title: "dash.weather", desc: "dash.weatherDesc", icon: CloudSun, tone: "text-tone-sky bg-tone-sky/15" },
  { path: "/leaf-disease-detection", title: "dash.disease", desc: "dash.diseaseDesc", icon: Bug, tone: "text-tone-rose bg-tone-rose/15" },
  { path: "/price-forecasting", title: "dash.prices", desc: "dash.pricesDesc", icon: LineChart, tone: "text-tone-amber bg-tone-amber/15" },
];

const greetingKey = (): TranslationKey => {
  const h = new Date().getHours();
  if (h < 12) return "dash.morning";
  if (h < 17) return "dash.afternoon";
  return "dash.evening";
};

const Dashboard = () => {
  const { t, locale } = useTranslation();
  const farmer = getFarmer();
  const query = savedWeatherQuery(farmer);

  const { data: weather, isLoading, isError } = useQuery({
    queryKey: ["weather", query],
    queryFn: () => fetchWeather(query),
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });

  const firstName = farmer?.name?.split(" ")[0] || t("dash.farmer");
  const condition = weather ? describeWeather(weather.current.weather_code) : null;
  const today = new Date().toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });

  return (
    <PageLayout backTo={false}>
      {/* Greeting */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="hero-gradient relative overflow-hidden rounded-3xl p-6 text-white shadow-lg"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-xl" />
        <p className="text-sm font-medium text-white/75">{today}</p>
        <h2 className="mt-1 text-2xl font-bold sm:text-3xl">
          {t(greetingKey())}, {firstName} 🌾
        </h2>
        <p className="mt-1 text-white/80">{t("dash.subtitle")}</p>

        {weather && condition && (
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="flex items-center gap-2 text-3xl font-bold">
              <condition.icon className="h-8 w-8" />
              {Math.round(weather.current.temperature_2m)}°
            </span>
            <span className="text-white/85">{t(condition.key)}</span>
            <span className="flex items-center gap-1 text-white/75">
              <MapPin className="h-3.5 w-3.5" /> {weather.location.name.split(",")[0]}
            </span>
          </div>
        )}
      </motion.section>

      {/* Quick actions */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("dash.quickActions")}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {ACTIONS.map(({ path, title, desc, icon: Icon, tone }, i) => (
            <motion.div
              key={path}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              whileTap={{ scale: 0.97 }}
            >
              <Link
                to={path}
                className="card-elevated group flex h-full flex-col gap-3 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <div className={`icon-chip h-12 w-12 ${tone}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold leading-tight">{t(title)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t(desc)}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Today's weather */}
      <section className="card-elevated p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">{t("dash.todayWeather")}</h3>
          <Link to="/weather" className="flex items-center text-sm font-medium text-primary hover:underline">
            {t("dash.viewForecast")} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : isError || !weather ? (
          <p className="text-sm text-muted-foreground">{t("dash.weatherUnavailable")}</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { icon: Droplets, value: `${Math.round(weather.current.relative_humidity_2m)}%`, label: t("weather.humidity"), tone: "text-tone-sky" },
              { icon: Wind, value: `${weather.current.wind_speed_10m.toFixed(0)} km/h`, label: t("weather.wind"), tone: "text-tone-violet" },
              { icon: CloudRain, value: `${Math.round(weather.daily[0]?.precipitation_probability_max ?? 0)}%`, label: t("weather.rain"), tone: "text-tone-amber" },
            ].map(({ icon: Icon, value, label, tone }) => (
              <div key={label} className="rounded-xl bg-muted/60 p-3">
                <Icon className={`mx-auto h-5 w-5 ${tone}`} />
                <p className="mt-1.5 text-lg font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Advice */}
      {weather && (
        <section className="card-elevated p-5">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <Lightbulb className="h-5 w-5 text-tone-amber" /> {t("dash.advice")}
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
      )}
    </PageLayout>
  );
};

export default Dashboard;
