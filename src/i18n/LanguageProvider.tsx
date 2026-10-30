import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useStoredState } from "../hooks/useStoredState";
import type { Language, Messages, Translate } from "./types";

export const languageOptions: Array<{ value: Language; label: string }> = [
  { value: "en", label: "English" },
  { value: "bn", label: "বাংলা" },
  { value: "te", label: "తెలుగు" },
  { value: "ta", label: "தமிழ்" },
  { value: "kn", label: "ಕನ್ನಡ" },
];
const loaders = {
  bn: () => import("./locales/bn"),
  te: () => import("./locales/te"),
  ta: () => import("./locales/ta"),
  kn: () => import("./locales/kn"),
};
const cache = new Map<Language, Messages>();
const LanguageContext = createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translate;
} | null>(null);
const validateLanguage = (value: string): Language =>
  languageOptions.some((option) => option.value === value)
    ? (value as Language)
    : "en";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useStoredState<Language>(
    "logscope-language",
    "en",
    validateLanguage,
  );
  const [loaded, setLoaded] = useState<{
    language: Language;
    messages: Messages;
  } | null>(null);
  useEffect(() => {
    document.documentElement.lang = language;
    if (language === "en") return;
    let cancelled = false;
    const cached = cache.get(language);
    if (cached) {
      setLoaded({ language, messages: cached });
      return;
    }
    void loaders[language]()
      .then(({ default: messages }) => {
        cache.set(language, messages);
        if (!cancelled) setLoaded({ language, messages });
      })
      .catch(() => {
        /* English remains available if a language chunk cannot load. */
      });
    return () => {
      cancelled = true;
    };
  }, [language]);
  const messages = language === loaded?.language ? loaded.messages : null;
  const t = useCallback<Translate>(
    (text, values) => {
      const translated =
        (messages as Record<string, string> | null)?.[text] ?? text;
      return values
        ? translated.replace(/\{(\w+)\}/g, (match, key: string) =>
            String(values[key] ?? match),
          )
        : translated;
    },
    [messages],
  );
  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t],
  );
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("LanguageProvider is required");
  return context;
}
