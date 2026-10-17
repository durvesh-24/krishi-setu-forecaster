import { Bug, CloudSun, Home, Leaf, LineChart, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "@/i18n/context";
import type { TranslationKey } from "@/i18n/translations";
import { cn } from "@/lib/utils";

const PAGES: { path: string; label: TranslationKey; icon: typeof Home }[] = [
  { path: "/dashboard", label: "nav.home", icon: Home },
  { path: "/crop-recommendation", label: "nav.crops", icon: Leaf },
  { path: "/leaf-disease-detection", label: "nav.disease", icon: Bug },
  { path: "/weather", label: "nav.weather", icon: CloudSun },
  { path: "/price-forecasting", label: "nav.prices", icon: LineChart },
  { path: "/profile", label: "nav.profile", icon: User },
];

/** Bottom navigation bar shown on every page after login. */
const Footer = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useTranslation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg">
      <div className="mx-auto grid max-w-3xl grid-cols-6">
        {PAGES.map(({ path, label, icon: Icon }) => {
          const active = pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              aria-current={active ? "page" : undefined}
              aria-label={t(label)}
              className={cn(
                "flex flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-12 items-center justify-center rounded-full transition-colors",
                  active && "bg-primary/15",
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="w-full truncate text-center">{t(label)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default Footer;
