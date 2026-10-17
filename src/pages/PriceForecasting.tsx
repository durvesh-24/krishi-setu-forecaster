import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CloudRain, Loader2, MapPin, TrendingDown, TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/i18n/context";
import { api, apiErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

interface PriceOptions {
  options: Record<string, Record<string, string[]>>;
  commodities: string[];
  data_start: string;
  data_end: string;
}

interface PricePoint {
  date: string;
  price: number;
}

interface OutlookPoint extends PricePoint {
  rain_mm?: number | null;
  rain_effect?: number | null;
  heavy_rain?: boolean;
  weather_source?: string;
}

interface PriceResult {
  predicted_price: number;
  rain_mm?: number | null;
  rain_7d_mm?: number | null;
  rain_effect?: number | null;
  rain_in_model?: boolean;
  heavy_rain_days?: string[];
  weather_source?: string;
  outlook?: OutlookPoint[];
  history?: PricePoint[];
  last_known_price?: number;
  last_data_date?: string;
  days_since_data?: number;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

const PriceForecasting = () => {
  const { toast } = useToast();
  const { t, tr, locale } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PriceResult | null>(null);
  const [formData, setFormData] = useState({ state: "", district: "", commodity: "", date: todayIso() });

  const { data: options, isLoading: optionsLoading, isError: optionsError, refetch } = useQuery({
    queryKey: ["price-options"],
    queryFn: async () => (await api.get<PriceOptions>("/price-options")).data,
    staleTime: Infinity,
  });

  const states = options ? Object.keys(options.options) : [];
  const districts = options && formData.state ? Object.keys(options.options[formData.state] ?? {}) : [];
  const commodities = options && formData.state && formData.district
    ? options.options[formData.state]?.[formData.district] ?? []
    : [];

  const commodityName = (c: string) => tr(`commodity.${c}`, c);
  const fmtDate = (d: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) =>
    new Date(`${d}T00:00:00`).toLocaleDateString(locale, opts);
  const rupees = (n: number) => `₹${Math.round(n).toLocaleString(locale)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.state || !formData.district || !formData.commodity || !formData.date) {
      toast({ title: t("price.missingTitle"), description: t("price.missing"), variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post<PriceResult>("/predict-price", formData);
      setResult(res.data);
      toast({ title: t("price.title"), description: t("price.done") });
    } catch (err) {
      toast({
        title: t("price.failed"),
        description: apiErrorMessage(err, t("price.failed")) ?? t("common.serverError"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const chartData = useMemo(() => {
    if (!result) return [];
    const rows: { date: string; recorded?: number; forecast?: number }[] = (result.history ?? []).map((p) => ({
      date: p.date,
      recorded: p.price,
    }));
    // connect the forecast line to the last recorded point
    if (rows.length) rows[rows.length - 1].forecast = rows[rows.length - 1].recorded;
    (result.outlook ?? []).forEach((p) => rows.push({ date: p.date, forecast: p.price }));
    return rows;
  }, [result]);

  const chartSpansYear =
    chartData.length > 1 &&
    new Date(chartData[chartData.length - 1].date).getTime() - new Date(chartData[0].date).getTime() > 180 * 864e5;

  const change = result?.last_known_price
    ? ((result.predicted_price - result.last_known_price) / result.last_known_price) * 100
    : null;

  return (
    <PageLayout title={t("price.title")}>
      {!result ? (
        <form onSubmit={handleSubmit} className="card-elevated space-y-5 p-5">
          <div>
            <h2 className="font-semibold">{t("price.details")}</h2>
            <p className="text-sm text-muted-foreground">{t("price.intro")}</p>
          </div>

          {optionsLoading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 rounded-lg" />
              ))}
            </div>
          ) : optionsError || !options ? (
            <div className="space-y-3 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
              <p>{t("price.optionsFailed")}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                {t("common.retry")}
              </Button>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t("price.state")}</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(state) => setFormData({ ...formData, state, district: "", commodity: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("price.selectState")} />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {states.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>{t("price.district")}</Label>
                  <Select
                    value={formData.district}
                    onValueChange={(district) => setFormData({ ...formData, district, commodity: "" })}
                    disabled={!formData.state}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("price.selectDistrict")} />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {districts.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>{t("price.commodity")}</Label>
                  <Select
                    value={formData.commodity}
                    onValueChange={(commodity) => setFormData({ ...formData, commodity })}
                    disabled={!formData.district}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("price.selectCommodity")} />
                    </SelectTrigger>
                    <SelectContent>
                      {commodities.map((c) => (
                        <SelectItem key={c} value={c}>
                          {commodityName(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="date">{t("price.date")}</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    min={options.data_start}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="h-12 w-full text-base font-semibold" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("price.predicting")}
                  </>
                ) : (
                  t("price.submit")
                )}
              </Button>
            </>
          )}
        </form>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Headline */}
          <section className="card-elevated overflow-hidden">
            <div className="hero-gradient p-5 text-white">
              <p className="flex items-center gap-1.5 text-sm text-white/80">
                <MapPin className="h-4 w-4" /> {formData.district}, {formData.state}
              </p>
              <p className="mt-3 text-sm font-medium text-white/80">
                {t("price.predicted")} · {commodityName(formData.commodity)} · {fmtDate(formData.date)}
              </p>
              <p className="mt-1 text-4xl font-extrabold tracking-tight">
                {rupees(result.predicted_price)}
                <span className="ml-2 text-base font-medium text-white/75">{t("price.perQuintal")}</span>
              </p>
            </div>
            {result.last_known_price !== undefined && (
              <div className="grid grid-cols-2 divide-x">
                <div className="p-4">
                  <p className="text-xs text-muted-foreground">{t("price.lastKnown")}</p>
                  <p className="mt-0.5 font-semibold">{rupees(result.last_known_price)}</p>
                  {result.last_data_date && (
                    <p className="text-xs text-muted-foreground">{fmtDate(result.last_data_date)}</p>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs text-muted-foreground">{t("price.change")}</p>
                  {change !== null && (
                    <p
                      className={cn(
                        "mt-0.5 flex items-center gap-1 font-semibold",
                        change >= 0 ? "text-tone-green" : "text-tone-rose",
                      )}
                    >
                      {change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {change >= 0 ? "+" : ""}
                      {change.toFixed(1)}%
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Rain */}
          {result.weather_source && result.weather_source !== "unavailable" && (
            <section className="card-elevated space-y-3 p-5">
              <h3 className="flex items-center gap-2 font-semibold">
                <CloudRain className="h-5 w-5 text-tone-sky" /> {t("price.rainTitle")}
              </h3>

              {result.heavy_rain_days && result.heavy_rain_days.length > 0 && (
                <div className="flex gap-2 rounded-xl border border-tone-sky/40 bg-tone-sky/10 p-3 text-sm">
                  <CloudRain className="mt-0.5 h-4 w-4 shrink-0 text-tone-sky" />
                  <p>
                    {t("price.heavyRain", {
                      dates: result.heavy_rain_days
                        .map((d) => fmtDate(d, { day: "numeric", month: "short" }))
                        .join(", "),
                    })}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted/60 p-3">
                  <p className="text-xs text-muted-foreground">{t("price.rainDay")}</p>
                  <p className="mt-0.5 text-lg font-bold">{(result.rain_mm ?? 0).toFixed(1)} mm</p>
                </div>
                <div className="rounded-xl bg-muted/60 p-3">
                  <p className="text-xs text-muted-foreground">{t("price.rainWeekLabel")}</p>
                  <p className="mt-0.5 text-lg font-bold">{(result.rain_7d_mm ?? 0).toFixed(0)} mm</p>
                </div>
              </div>

              {result.rain_in_model && result.rain_effect != null ? (
                <p className="text-sm">
                  {t("price.rainEffect")}:{" "}
                  <span
                    className={cn(
                      "font-semibold",
                      Math.abs(result.rain_effect) < 1 ? "" : result.rain_effect > 0 ? "text-tone-green" : "text-tone-rose",
                    )}
                  >
                    {result.rain_effect >= 0 ? "+" : "−"}₹{Math.abs(Math.round(result.rain_effect)).toLocaleString(locale)}
                  </span>{" "}
                  <span className="text-muted-foreground">{t("price.rainVsDry")}</span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">{t("price.rainChecked")}</p>
              )}

              <p className="text-xs text-muted-foreground">
                {t(
                  result.weather_source === "forecast"
                    ? "price.srcForecast"
                    : result.weather_source === "recorded"
                      ? "price.srcRecorded"
                      : "price.srcSeasonal",
                )}
              </p>
            </section>
          )}

          {/* Chart */}
          {chartData.length > 1 && (
            <section className="card-elevated p-5">
              <h3 className="mb-4 font-semibold">{t("price.chart")}</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) =>
                        fmtDate(d, chartSpansYear ? { month: "short", year: "2-digit" } : { day: "numeric", month: "short" })
                      }
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      tickLine={false}
                      minTickGap={24}
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={52}
                      tickFormatter={(v) => `₹${Math.round(v)}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 12,
                        color: "hsl(var(--popover-foreground))",
                      }}
                      labelFormatter={(d) => fmtDate(String(d))}
                      formatter={(v: number, name) => [rupees(v), name]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="recorded"
                      name={t("price.recorded")}
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      name={t("price.forecast")}
                      stroke="hsl(var(--tone-amber))"
                      strokeWidth={2.5}
                      strokeDasharray="6 4"
                      dot={{ r: 3, fill: "hsl(var(--tone-amber))" }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* Outlook */}
          {result.outlook && result.outlook.length > 1 && (
            <section className="card-elevated p-5">
              <h3 className="mb-2 font-semibold">{t("price.outlook")}</h3>
              <ul className="divide-y">
                {result.outlook.map((p, i) => {
                  const prev = i === 0 ? result.last_known_price : result.outlook![i - 1].price;
                  const up = prev === undefined || p.price >= prev;
                  return (
                    <li key={p.date} className="flex items-center gap-3 py-2.5 text-sm">
                      <span>{fmtDate(p.date, { weekday: "short", day: "numeric", month: "short" })}</span>
                      {p.rain_mm != null && p.rain_mm >= 1 && (
                        <span className="flex items-center gap-1 text-xs text-tone-sky">
                          <CloudRain className="h-3.5 w-3.5" /> {p.rain_mm.toFixed(0)} mm
                        </span>
                      )}
                      <span className="ml-auto flex items-center gap-2 font-semibold">
                        {rupees(p.price)}
                        {up ? (
                          <TrendingUp className="h-4 w-4 text-tone-green" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-tone-rose" />
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <Button onClick={() => setResult(null)} variant="outline" className="h-11 w-full">
            {t("price.another")}
          </Button>
        </motion.div>
      )}
    </PageLayout>
  );
};

export default PriceForecasting;
