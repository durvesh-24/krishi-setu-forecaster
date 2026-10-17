import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Bug, CloudSun, Leaf, LineChart, Sprout } from "lucide-react";
import { Signup } from "@/components/Signup";
import { Login } from "@/components/Login";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTranslation } from "@/i18n/LanguageProvider";
import { getFarmer } from "@/lib/user";

const Index = () => {
  const [tab, setTab] = useState<"signup" | "login">("login");
  const { t } = useTranslation();

  if (getFarmer()) return <Navigate to="/dashboard" replace />;

  const features = [
    { icon: Leaf, text: t("auth.feature1") },
    { icon: Bug, text: t("auth.feature2") },
    { icon: LineChart, text: t("auth.feature3") },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      {/* LEFT SIDE - Branding */}
      <aside className="hero-gradient relative hidden w-1/2 overflow-hidden text-white md:flex md:flex-col md:justify-between md:p-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-black/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30">
            <Sprout className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">{t("app.name")}</span>
        </div>

        <div className="relative max-w-md space-y-8">
          <div className="space-y-3">
            <h1 className="text-5xl font-extrabold leading-tight tracking-tight">{t("app.tagline")}</h1>
            <p className="text-lg text-white/80">{t("app.empowering")}</p>
          </div>
          <ul className="space-y-3">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/15">
                <Icon className="h-5 w-5 shrink-0" />
                <span className="font-medium">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-2 text-sm text-white/70">
          <CloudSun className="h-4 w-4" />
          <span>{t("dash.subtitle")}</span>
        </div>
      </aside>

      {/* RIGHT SIDE - Forms */}
      <main className="flex w-full flex-col md:w-1/2">
        <div className="flex items-center justify-between px-4 py-3 md:justify-end">
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sprout className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold">{t("app.name")}</span>
          </div>
          <div className="flex items-center">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-10">
          {tab === "signup" ? <Signup setTab={setTab} /> : <Login setTab={setTab} />}
        </div>
      </main>
    </div>
  );
};

export default Index;
