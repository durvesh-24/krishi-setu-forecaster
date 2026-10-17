import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { languageFromName, useTranslation } from "@/i18n/context";
import { supabase } from "@/lib/supabase";
import { saveFarmer, type Farmer } from "@/lib/user";

export const Login = ({
  setTab,
}: {
  setTab: (tab: "signup" | "login") => void;
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, setLang } = useTranslation();
  const [formData, setFormData] = useState({ phone: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: name === "phone" ? value.replace(/\D/g, "").slice(0, 10) : value });
  };

  const fail = (description: string) =>
    toast({ title: t("auth.login"), description, variant: "destructive" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { phone, password } = formData;
    if (phone.length !== 10) return fail(t("auth.phoneInvalid"));

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("signin_farmer", {
        p_phone: phone,
        p_password: password,
      });
      if (error) throw error;

      const farmer = Array.isArray(data) ? (data[0] as Farmer | undefined) : undefined;
      if (!farmer || (typeof data === "string" && data.toLowerCase().includes("invalid"))) {
        return fail(t("auth.invalidLogin"));
      }

      saveFarmer(farmer);
      const preferred = languageFromName(farmer.language);
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
        <h2 className="text-3xl font-bold tracking-tight">{t("auth.loginTitle")}</h2>
        <p className="text-muted-foreground">{t("auth.loginSubtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="login-phone">{t("auth.phone")}</Label>
          <Input
            id="login-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            name="phone"
            placeholder={t("auth.phonePlaceholder")}
            value={formData.phone}
            onChange={handleChange}
            required
            className="h-11"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="login-password">{t("auth.password")}</Label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            name="password"
            placeholder={t("auth.passwordPlaceholder")}
            value={formData.password}
            onChange={handleChange}
            required
            className="h-11"
          />
        </div>

        <Button type="submit" size="lg" className="h-11 w-full gap-2 font-semibold" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> {t("auth.loggingIn")}
            </>
          ) : (
            <>
              {t("auth.login")} <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t("auth.noAccount")}{" "}
        <button type="button" onClick={() => setTab("signup")} className="font-semibold text-primary hover:underline">
          {t("auth.signUp")}
        </button>
      </p>
    </div>
  );
};

export default Login;
