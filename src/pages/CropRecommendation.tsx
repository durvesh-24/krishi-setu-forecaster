import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CloudSun, Droplets, FlaskConical, Leaf, Loader2, Sparkles, Thermometer, Waves } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/i18n/LanguageProvider";
import type { TranslationKey } from "@/i18n/translations";
import { api, apiErrorMessage } from "@/lib/api";
import { getFarmer } from "@/lib/user";
import { fetchWeather, savedWeatherQuery } from "@/lib/weather";
import cropData from "@/data/commodity_npk_fertilizer_data.json";

type FieldName = "nitrogen" | "phosphorus" | "potassium" | "temp" | "humidity" | "ph" | "rainfall";

interface CropInfo {
  N_range_kg_per_ha: string;
  P_range_kg_per_ha: string;
  K_range_kg_per_ha: string;
  preferred_fertilizer: string;
}

interface CropResult {
  crop: string;
  confidence: number;
}

const FIELDS: {
  name: FieldName;
  label: TranslationKey;
  icon: typeof Leaf;
  tone: string;
  placeholder: string;
  min?: number;
  max?: number;
  step?: string;
  group: "soil" | "climate";
}[] = [
  { name: "nitrogen", label: "crop.nitrogen", icon: Leaf, tone: "text-tone-green bg-tone-green/15", placeholder: "0 – 140", min: 0, max: 200, group: "soil" },
  { name: "phosphorus", label: "crop.phosphorus", icon: FlaskConical, tone: "text-tone-amber bg-tone-amber/15", placeholder: "5 – 145", min: 0, max: 200, group: "soil" },
  { name: "potassium", label: "crop.potassium", icon: Sparkles, tone: "text-tone-violet bg-tone-violet/15", placeholder: "5 – 205", min: 0, max: 250, group: "soil" },
  { name: "temp", label: "crop.temperature", icon: Thermometer, tone: "text-tone-rose bg-tone-rose/15", placeholder: "8 – 44", min: -10, max: 60, step: "0.1", group: "climate" },
  { name: "humidity", label: "crop.humidity", icon: Droplets, tone: "text-tone-sky bg-tone-sky/15", placeholder: "14 – 100", min: 0, max: 100, step: "0.1", group: "climate" },
  { name: "ph", label: "crop.ph", icon: FlaskConical, tone: "text-tone-green bg-tone-green/15", placeholder: "3.5 – 9.9", min: 0, max: 14, step: "0.1", group: "climate" },
  { name: "rainfall", label: "crop.rainfall", icon: Waves, tone: "text-tone-sky bg-tone-sky/15", placeholder: "20 – 300", min: 0, max: 1000, step: "0.1", group: "climate" },
];

const EMPTY: Record<FieldName, string> = { nitrogen: "", phosphorus: "", potassium: "", temp: "", humidity: "", ph: "", rainfall: "" };
const SAMPLE: Record<FieldName, string> = { nitrogen: "90", phosphorus: "42", potassium: "43", temp: "21", humidity: "82", ph: "6.5", rainfall: "203" };

const CropRecommendation = () => {
  const { toast } = useToast();
  const { t, tr } = useTranslation();
  const [formData, setFormData] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CropResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Today's weather (shared cache with the dashboard) to pre-fill temperature & humidity
  const weatherQuery = savedWeatherQuery(getFarmer());
  const { data: cachedWeather } = useQuery({
    queryKey: ["weather", weatherQuery],
    queryFn: () => fetchWeather(weatherQuery),
    staleTime: 15 * 60 * 1000,
    retry: false,
  });

  const fillFromWeather = () => {
    if (!cachedWeather) return;
    setFormData((f) => ({
      ...f,
      temp: cachedWeather.current.temperature_2m.toFixed(1),
      humidity: cachedWeather.current.relative_humidity_2m.toFixed(0),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Payload for FastAPI
    const payload = {
      N: parseFloat(formData.nitrogen),
      P: parseFloat(formData.phosphorus),
      K: parseFloat(formData.potassium),
      temperature: parseFloat(formData.temp),
      humidity: parseFloat(formData.humidity),
      ph: parseFloat(formData.ph),
      rainfall: parseFloat(formData.rainfall),
    };

    try {
      const res = await api.post<{ predicted_crop: string; top_crops?: CropResult[] }>("/predict", payload);
      const top = res.data.top_crops?.length
        ? res.data.top_crops
        : [{ crop: res.data.predicted_crop, confidence: 1 }];
      setResults(top);
      toast({ title: t("crop.doneTitle"), description: t("crop.doneDesc") });
    } catch (err) {
      setError(apiErrorMessage(err, t("crop.failed")) ?? t("common.serverError"));
    } finally {
      setLoading(false);
    }
  };

  const cropName = (crop: string) => tr(`cropName.${crop.toLowerCase()}`, crop);
  const info = (crop: string) => (cropData as Record<string, CropInfo>)[crop.toLowerCase()];

  const renderGroup = (group: "soil" | "climate", title: TranslationKey) => (
    <fieldset className="space-y-3">
      <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t(title)}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.filter((f) => f.group === group).map(({ name, label, icon: Icon, tone, placeholder, min, max, step }) => (
          <div key={name} className="flex items-center gap-3 rounded-xl border bg-background/60 p-3">
            <div className={`icon-chip h-10 w-10 ${tone}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor={name} className="text-xs font-medium text-muted-foreground">
                {t(label)}
              </Label>
              <Input
                id={name}
                type="number"
                inputMode="decimal"
                placeholder={placeholder}
                value={formData[name]}
                onChange={(e) => setFormData({ ...formData, [name]: e.target.value })}
                required
                min={min}
                max={max}
                step={step ?? "any"}
                className="h-9 border-0 bg-transparent px-0 text-base font-semibold shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );

  const [best, ...others] = results ?? [];
  const bestInfo = best ? info(best.crop) : undefined;

  return (
    <PageLayout title={t("crop.title")}>
      {!results ? (
        <form onSubmit={handleSubmit} className="card-elevated space-y-6 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{t("crop.intro")}</p>
            <div className="flex gap-2">
              {cachedWeather && (
                <Button type="button" variant="secondary" size="sm" onClick={fillFromWeather} className="gap-1.5">
                  <CloudSun className="h-4 w-4" /> {t("crop.useWeather")}
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => setFormData(SAMPLE)}>
                {t("crop.sample")}
              </Button>
            </div>
          </div>

          {renderGroup("soil", "crop.soil")}
          {renderGroup("climate", "crop.climate")}

          <Button type="submit" className="h-12 w-full text-base font-semibold" size="lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("crop.analyzing")}
              </>
            ) : (
              t("crop.submit")
            )}
          </Button>
          {error && <p className="rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">{error}</p>}
        </form>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Best crop */}
          <section className="card-elevated overflow-hidden">
            <div className="hero-gradient p-5 text-white">
              <p className="text-sm font-medium text-white/80">{t("crop.best")}</p>
              <div className="mt-1 flex items-end justify-between gap-3">
                <h2 className="text-3xl font-extrabold">{cropName(best.crop)}</h2>
                <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">
                  {t("crop.match", { value: Math.round(best.confidence * 100) })}
                </span>
              </div>
            </div>

            {bestInfo && (
              <div className="space-y-4 p-5">
                <div>
                  <p className="mb-2 text-sm font-semibold text-muted-foreground">{t("crop.nutrients")}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { k: "N", v: bestInfo.N_range_kg_per_ha, tone: "text-tone-green" },
                      { k: "P", v: bestInfo.P_range_kg_per_ha, tone: "text-tone-amber" },
                      { k: "K", v: bestInfo.K_range_kg_per_ha, tone: "text-tone-violet" },
                    ].map(({ k, v, tone }) => (
                      <div key={k} className="rounded-xl bg-muted/60 p-3">
                        <p className={`text-xs font-bold ${tone}`}>{k}</p>
                        <p className="mt-1 font-semibold">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <p className="text-sm font-semibold text-muted-foreground">{t("crop.fertilizer")}</p>
                  <p className="mt-1 font-semibold text-primary">{bestInfo.preferred_fertilizer}</p>
                </div>
              </div>
            )}
          </section>

          {/* Other options */}
          {others.length > 0 && (
            <section className="card-elevated space-y-3 p-5">
              <h3 className="font-semibold">{t("crop.others")}</h3>
              {others.map((c) => (
                <div key={c.crop} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{cropName(c.crop)}</span>
                    <span className="text-muted-foreground">{t("crop.match", { value: Math.round(c.confidence * 100) })}</span>
                  </div>
                  <Progress value={c.confidence * 100} className="h-2" />
                  {info(c.crop) && (
                    <p className="text-xs text-muted-foreground">{info(c.crop).preferred_fertilizer}</p>
                  )}
                </div>
              ))}
            </section>
          )}

          <Button onClick={() => setResults(null)} variant="outline" className="h-11 w-full">
            {t("crop.tryAgain")}
          </Button>
        </motion.div>
      )}
    </PageLayout>
  );
};

export default CropRecommendation;
