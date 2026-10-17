import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { languageFromName, useTranslation } from "@/i18n/LanguageProvider";
import { LANGUAGES } from "@/i18n/translations";
import { INDIAN_STATES } from "@/data/indian_states";
import { supabase } from "@/lib/supabase";
import { saveFarmer, type Farmer } from "@/lib/user";

export const Signup = ({ setTab }: { setTab: (tab: "signup" | "login") => void }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, lang, setLang } = useTranslation();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    state: "",
    acres: "",
    // stored in the database as "English" / "Hindi" / "Marathi"
    language: (LANGUAGES.find((l) => l.code === lang)?.label ?? "English") as string,
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: name === "phone" ? value.replace(/\D/g, "").slice(0, 10) : value });
  };

  const fail = (description: string) =>
    toast({ title: t("auth.signUp"), description, variant: "destructive" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { name, phone, state, acres, language, password } = formData;
    if (phone.length !== 10) return fail(t("auth.phoneInvalid"));
    if (password.length < 6) return fail(t("auth.passwordShort"));
    if (!state) return fail(t("auth.selectState"));

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("signup_farmer", {
        p_name: name.trim(),
        p_phone: phone,
        p_state: state,
        p_acres: acres,
        p_language: language,
        p_password: password,
      });

      if (error) throw error;

      if (typeof data === "string" && data.toLowerCase().includes("already registered")) {
        toast({ title: t("auth.signUp"), description: t("auth.alreadyRegistered") });
        setTab("login");
        return;
      }

      saveFarmer((data as Farmer[])[0]);
      const preferred = languageFromName(language);
      if (preferred) setLang(preferred);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      fail(err instanceof Error && err.message ? err.message : t("auth.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm space-y-7">
      <div className="space-y-1.5 text-center">
        <h2 className="text-3xl font-bold tracking-tight">{t("auth.signupTitle")}</h2>
        <p className="text-muted-foreground">{t("auth.signupSubtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="su-name">{t("auth.name")}</Label>
          <Input
            id="su-name"
            name="name"
            autoComplete="name"
            placeholder={t("auth.namePlaceholder")}
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="su-phone">{t("auth.phone")}</Label>
          <Input
            id="su-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            name="phone"
            placeholder={t("auth.phonePlaceholder")}
            value={formData.phone}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t("auth.state")}</Label>
            <Select value={formData.state} onValueChange={(state) => setFormData({ ...formData, state })}>
              <SelectTrigger>
                <SelectValue placeholder={t("auth.selectState")} />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {INDIAN_STATES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="su-acres">{t("auth.acres")}</Label>
            <Input
              id="su-acres"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              name="acres"
              placeholder={t("auth.acresPlaceholder")}
              value={formData.acres}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>{t("auth.preferredLanguage")}</Label>
          <Select value={formData.language} onValueChange={(language) => setFormData({ ...formData, language })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.label}>
                  {l.native}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="su-password">{t("auth.password")}</Label>
          <Input
            id="su-password"
            type="password"
            autoComplete="new-password"
            name="password"
            placeholder={t("auth.setPassword")}
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
          />
        </div>

        <Button type="submit" size="lg" className="h-11 w-full font-semibold" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("auth.signingUp")}
            </>
          ) : (
            t("auth.signUp")
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t("auth.haveAccount")}{" "}
        <button type="button" onClick={() => setTab("login")} className="font-semibold text-primary hover:underline">
          {t("auth.login")}
        </button>
      </p>
    </div>
  );
};
