import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { LANGUAGES, translations, type Language, type TranslationKey } from "./translations";

const STORAGE_KEY = "krishisetu-language";

const LOCALES: Record<Language, string> = { en: "en-IN", hi: "hi-IN", mr: "mr-IN" };

type Vars = Record<string, string | number>;

interface LanguageContextValue {
  lang: Language;
  locale: string;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey, vars?: Vars) => string;
  /** Translate a key that is built at runtime (e.g. crop names); falls back to the given text. */
  tr: (key: string, fallback: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const isLanguage = (value: unknown): value is Language =>
  LANGUAGES.some((l) => l.code === value);

/** Map the language saved at sign-up ("Hindi", "Marathi", "English") to a code. */
export const languageFromName = (name?: string | null): Language | null => {
  if (!name) return null;
  const match = LANGUAGES.find(
    (l) => l.code === name.toLowerCase() || l.label.toLowerCase() === name.toLowerCase(),
  );
  return match ? match.code : null;
};

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

export const useTranslation = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useTranslation must be used inside LanguageProvider");
  return ctx;
};
