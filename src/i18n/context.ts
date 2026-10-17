import { createContext, useContext } from "react";
import { LANGUAGES, type Language } from "./languages";
import type { TranslationKey } from "./translations";

// Kept apart from LanguageProvider.tsx so the context object stays the same
// when translations are edited during development (hot reload).

export type Vars = Record<string, string | number>;

export interface LanguageContextValue {
  lang: Language;
  locale: string;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey, vars?: Vars) => string;
  /** Translate a key that is built at runtime (e.g. crop names); falls back to the given text. */
  tr: (key: string, fallback: string) => string;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);

export const isLanguage = (value: unknown): value is Language =>
  LANGUAGES.some((l) => l.code === value);

/** Map the language saved at sign-up ("Hindi", "Marathi", "English") to a code. */
export const languageFromName = (name?: string | null): Language | null => {
  if (!name) return null;
  const match = LANGUAGES.find(
    (l) => l.code === name.toLowerCase() || l.label.toLowerCase() === name.toLowerCase(),
  );
  return match ? match.code : null;
};

export const useTranslation = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useTranslation must be used inside LanguageProvider");
  return ctx;
};
