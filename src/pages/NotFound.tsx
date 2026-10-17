import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/LanguageProvider";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sprout className="h-8 w-8" />
        </div>
        <h1 className="text-5xl font-extrabold">404</h1>
        <p className="text-lg text-muted-foreground">{t("notFound.title")}</p>
        <Button asChild>
          <Link to="/">{t("notFound.back")}</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
