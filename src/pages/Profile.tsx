import { motion } from "framer-motion";
import { Calendar, Globe, LogOut, MapPin, Monitor, Moon, Phone, Ruler, Sun } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/LanguageProvider";
import { LANGUAGES } from "@/i18n/translations";
import { clearFarmer, getFarmer } from "@/lib/user";
import { cn } from "@/lib/utils";

const Profile = () => {
  const navigate = useNavigate();
  const { t, lang, setLang } = useTranslation();
  const { theme, setTheme } = useTheme();
  const user = getFarmer();

  if (!user) return <Navigate to="/" replace />;

  const logout = () => {
    clearFarmer();
    navigate("/", { replace: true });
  };

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const themes = [
    { value: "light", label: t("theme.light"), icon: Sun },
    { value: "dark", label: t("theme.dark"), icon: Moon },
    { value: "system", label: t("theme.system"), icon: Monitor },
  ];

  const details = [
    { icon: Phone, label: t("profile.phone"), value: user.phone },
    { icon: MapPin, label: t("auth.state"), value: user.state },
    { icon: Ruler, label: t("profile.acres"), value: String(user.acres) },
    { icon: Calendar, label: t("profile.memberSince"), value: String(new Date(user.created_at).getFullYear()) },
  ];

  return (
    <PageLayout
      title={t("profile.title")}
      actions={
        <Button variant="ghost" size="sm" onClick={logout} className="gap-1.5 text-destructive hover:text-destructive">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">{t("profile.logout")}</span>
        </Button>
      }
    >
      {/* Profile card */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-elevated overflow-hidden">
        <div className="hero-gradient h-20" />
        <div className="-mt-10 px-5 pb-5 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-card bg-primary text-2xl font-bold text-primary-foreground">
            {initials || "?"}
          </div>
          <h2 className="mt-3 text-2xl font-bold">{user.name}</h2>
          <p className="font-medium text-primary">{t("profile.farmerFrom", { state: user.state })}</p>
        </div>
        <dl className="grid grid-cols-2 border-t sm:grid-cols-4">
          {details.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex flex-col items-center gap-1 border-b p-4 text-center sm:border-b-0 [&:not(:last-child)]:sm:border-r">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="truncate text-sm font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </motion.section>

      {/* Settings */}
      <section className="card-elevated space-y-5 p-5">
        <h3 className="font-semibold">{t("profile.settings")}</h3>

        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Globe className="h-4 w-4" /> {t("common.language")}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                  lang === l.code ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
                )}
              >
                {l.native}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sun className="h-4 w-4" /> {t("common.theme")}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {themes.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                  theme === value ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
                )}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <Button variant="outline" onClick={logout} className="h-11 w-full gap-2 text-destructive hover:text-destructive">
        <LogOut className="h-4 w-4" /> {t("profile.logout")}
      </Button>
    </PageLayout>
  );
};

export default Profile;
