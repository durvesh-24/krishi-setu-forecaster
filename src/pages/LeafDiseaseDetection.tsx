import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Droplets,
  FlaskConical,
  ImagePlus,
  Info,
  Loader2,
  Stethoscope,
  Upload,
} from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/i18n/LanguageProvider";
import { getDiseaseInfo } from "@/i18n/diseases";
import { api, apiErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

interface DiseaseResponse {
  disease: string;
  class?: string;
  confidence: number;
  alternatives?: { class: string; confidence: number }[];
}

const MAX_SIZE = 10 * 1024 * 1024;
const LOW_CONFIDENCE = 0.5;

const LeafDiseaseDetection = () => {
  const { toast } = useToast();
  const { t, lang } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<DiseaseResponse | null>(null);
  const [species, setSpecies] = useState<string | null>(null);

  const acceptFile = (file?: File | null) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError(t("disease.invalid"));
      toast({ title: t("disease.invalidTitle"), description: t("disease.invalid"), variant: "destructive" });
      return;
    }
    if (file.size > MAX_SIZE) {
      setError(t("disease.tooLarge"));
      toast({ title: t("disease.tooLargeTitle"), description: t("disease.tooLarge"), variant: "destructive" });
      return;
    }

    setImageFile(file);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setSelectedImage(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    acceptFile(e.dataTransfer.files?.[0]);
  };

  const reset = () => {
    setSelectedImage(null);
    setImageFile(null);
    setPrediction(null);
    setSpecies(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", imageFile);

    const [diseaseResult, leafResult] = await Promise.allSettled([
      api.post<DiseaseResponse>("/predict-disease", formData),
      api.post<{ species: string; confidence: number }>("/predict-leaf", formData),
    ]);

    setSpecies(
      leafResult.status === "fulfilled" && leafResult.value.data.species && leafResult.value.data.confidence > 0
        ? leafResult.value.data.species
        : null,
    );

    if (diseaseResult.status === "fulfilled") {
      const data = diseaseResult.value.data;
      setPrediction({ ...data, disease: (data.disease || data.class || "").trim() });
      toast({ title: t("disease.doneTitle"), description: t("disease.doneDesc") });
    } else {
      const message = apiErrorMessage(diseaseResult.reason, t("disease.failed")) ?? t("common.serverError");
      setError(message);
      toast({ title: t("disease.failedTitle"), description: message, variant: "destructive" });
    }
    setLoading(false);
  };

  const info = prediction ? getDiseaseInfo(prediction.disease, lang) : null;
  const confidencePct = prediction ? Math.round(prediction.confidence * 100) : 0;

  return (
    <PageLayout title={t("disease.title")}>
      {!prediction || !info ? (
        <form onSubmit={handleSubmit} className="card-elevated space-y-5 p-5">
          <div>
            <h2 className="font-semibold">{t("disease.upload")}</h2>
            <p className="text-sm text-muted-foreground">{t("disease.intro")}</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => acceptFile(e.target.files?.[0])}
            className="hidden"
          />

          {selectedImage ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center overflow-hidden rounded-xl bg-muted">
                <img src={selectedImage} alt="Preview" className="max-h-80 w-auto object-contain" />
              </div>
              <Button type="button" variant="outline" className="w-full gap-2" onClick={() => fileInputRef.current?.click()}>
                <ImagePlus className="h-4 w-4" /> {t("disease.change")}
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={cn(
                "flex h-72 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
                dragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/60 hover:bg-primary/5",
              )}
            >
              <div className="icon-chip h-16 w-16 rounded-full bg-tone-sky/15 text-tone-sky">
                <Upload className="h-8 w-8" />
              </div>
              <p className="font-semibold">{t("disease.drop")}</p>
              <p className="text-sm text-muted-foreground">{t("disease.formats")}</p>
            </button>
          )}

          <Button type="submit" className="h-12 w-full text-base font-semibold" size="lg" disabled={loading || !imageFile}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("disease.analyzing")}
              </>
            ) : (
              t("disease.analyze")
            )}
          </Button>

          {error && (
            <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </form>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <section className="card-elevated overflow-hidden">
            <div className="grid sm:grid-cols-[200px_1fr]">
              {selectedImage && (
                <div className="flex items-center justify-center bg-muted">
                  <img src={selectedImage} alt={t("disease.image")} className="max-h-60 w-full object-cover sm:h-full" />
                </div>
              )}
              <div className="space-y-4 p-5">
                <div
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                    info.healthy ? "bg-tone-green/15 text-tone-green" : "bg-tone-rose/15 text-tone-rose",
                  )}
                >
                  {info.healthy ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  {info.healthy ? t("disease.healthy") : t("disease.detected")}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    {info.plant}
                    {species && (
                      <>
                        {" · "}
                        <span title={t("disease.species")}>{species}</span>
                      </>
                    )}
                  </p>
                  <h2 className="text-2xl font-bold">{info.healthy ? t("disease.healthy") : info.name}</h2>
                  {info.healthy && <p className="mt-1 text-sm text-muted-foreground">{t("disease.healthyDesc")}</p>}
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("disease.confidence")}</span>
                    <span className="font-semibold">{confidencePct}%</span>
                  </div>
                  <Progress value={confidencePct} className="h-2" />
                </div>
              </div>
            </div>
          </section>

          {prediction.confidence < LOW_CONFIDENCE && (
            <div className="flex gap-2 rounded-xl border border-tone-amber/40 bg-tone-amber/10 p-4 text-sm">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-tone-amber" />
              <p>{t("disease.lowConfidence")}</p>
            </div>
          )}

          <section className="card-elevated divide-y">
            {[
              { icon: Info, title: t("disease.about"), body: info.description, tone: "text-tone-sky bg-tone-sky/15" },
              { icon: Stethoscope, title: t("disease.treatment"), body: info.treatment, tone: "text-tone-green bg-tone-green/15" },
              { icon: FlaskConical, title: t("disease.product"), body: info.product, tone: "text-tone-violet bg-tone-violet/15" },
              { icon: Droplets, title: t("disease.watering"), body: info.water, tone: "text-tone-sky bg-tone-sky/15" },
            ]
              .filter((row) => row.body)
              .map(({ icon: Icon, title, body, tone }) => (
                <div key={title} className="flex gap-3 p-4">
                  <div className={`icon-chip h-9 w-9 ${tone}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>
                  </div>
                </div>
              ))}
          </section>

          {prediction.alternatives && prediction.alternatives.length > 0 && (
            <section className="card-elevated space-y-3 p-5">
              <h3 className="text-sm font-semibold">{t("disease.alternatives")}</h3>
              {prediction.alternatives.map((alt) => {
                const a = getDiseaseInfo(alt.class, lang);
                return (
                  <div key={alt.class} className="flex items-center justify-between gap-3 text-sm">
                    <span>
                      {a.plant} — {a.healthy ? t("disease.healthy") : a.name}
                    </span>
                    <span className="text-muted-foreground">{Math.round(alt.confidence * 100)}%</span>
                  </div>
                );
              })}
            </section>
          )}

          <Button onClick={reset} className="h-11 w-full">
            {t("disease.another")}
          </Button>
        </motion.div>
      )}
    </PageLayout>
  );
};

export default LeafDiseaseDetection;
