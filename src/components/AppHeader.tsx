import { ArrowLeft, Sprout } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTranslation } from "@/i18n/context";

interface AppHeaderProps {
  title?: string;
  /** Show a back button that goes to this path (defaults to the dashboard). */
  backTo?: string | false;
  actions?: React.ReactNode;
}

export const AppHeader = ({ title, backTo = "/dashboard", actions }: AppHeaderProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-3xl items-center gap-2 px-4">
        {backTo ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("common.back")}
            onClick={() => navigate(backTo)}
            className="-ml-2 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Sprout className="h-5 w-5" />
          </div>
        )}
        <h1 className="flex-1 truncate text-lg font-bold tracking-tight">
          {title ?? t("app.name")}
        </h1>
        {actions}
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
};

export default AppHeader;
