import { useCallback, useEffect, useMemo, useState } from "react";
import { translations, type Language } from "./translations";
import { isLanguage, LanguageContext, type LanguageContextValue, type Vars } from "./context";

const STORAGE_KEY = "krishisetu-language";

const LOCALES: Record<Language, string> = { en: "en-IN", hi: "hi-IN", mr: "mr-IN" };

const readStoredLanguage = (): Language => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLanguage(saved)) return saved;
  } catch {
    // storage unavailable
  }
  return "en";
};

const format = (text: string, vars?: Vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : text;

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState<Language>(readStoredLanguage);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage unavailable
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<LanguageContextValue>(() => {
    const dict = translations[lang];
    return {
      lang,
      locale: LOCALES[lang],
      setLang,
      t: (key, vars) => format(dict[key] ?? translations.en[key] ?? key, vars),
      tr: (key, fallback) =>
        (dict as Record<string, string>)[key] ??
        (translations.en as Record<string, string>)[key] ??
        fallback,
    };
  }, [lang, setLang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

