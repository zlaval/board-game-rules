import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import en from "./locales/en.json";
import hu from "./locales/hu.json";

export type Language = "en" | "hu";
export type Params = Record<string, string | number>;
export type Translator = (key: string, params?: Params) => string;
const catalogs: Record<Language, Record<keyof typeof en, string>> = { en, hu };
const storageKey = "ruleshelf.language";
let currentLanguage: Language = "en";
try {
  if (localStorage.getItem(storageKey) === "hu") currentLanguage = "hu";
} catch {
  /* Storage may be disabled; keep an in-memory preference. */
}

export function getLanguage() {
  return currentLanguage;
}

export function translate(
  key: string,
  language: Language,
  params: Params = {},
): string {
  const catalog: Record<string, string> = catalogs[language];
  const text = (catalog[key] ?? key).replace(/\{(\w+)\}/g, (match, name) =>
    String(params[name] ?? match),
  );
  return language === "en"
    ? text.replace(/(\w+)\(s\)/g, "$1" + (params.count === 1 ? "" : "s"))
    : text;
}

export class MessageError extends Error {
  constructor(
    public key: string,
    public params: Params = {},
    public causeError?: unknown,
  ) {
    super(key);
  }
}

export function errorMessage(error: unknown, t: Translator): string {
  if (error instanceof MessageError) {
    const message = t(error.key, error.params);
    return error.causeError
      ? `${message} ${errorMessage(error.causeError, t)}`
      : message;
  }
  return t(
    error instanceof TypeError
      ? "errors.network_error"
      : "errors.unexpected_error",
  );
}

const Context = createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translator;
} | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setValue] = useState<Language>(currentLanguage);
  const t = useCallback<Translator>(
    (key, params) => translate(key, language, params),
    [language],
  );
  const setLanguage = useCallback((value: Language) => {
    currentLanguage = value;
    try {
      localStorage.setItem(storageKey, value);
    } catch {
      /* In-memory preference still works. */
    }
    setValue(value);
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", t("Board game rulebooks, all in one place."));
  }, [language, t]);
  return (
    <Context.Provider value={{ language, setLanguage, t }}>
      {children}
    </Context.Provider>
  );
}

export function useI18n() {
  const value = useContext(Context);
  if (!value) throw new Error("LanguageProvider is required");
  return value;
}

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();
  return (
    <div
      className="language-switcher"
      role="group"
      aria-label={t("Interface language")}
    >
      <button
        type="button"
        aria-label="English"
        title="English"
        aria-pressed={language === "en"}
        onClick={() => setLanguage("en")}
      >
        <svg viewBox="0 0 32 20" aria-hidden="true">
          <path fill="#244782" d="M0 0h32v20H0z" />
          <path stroke="#fff" strokeWidth="5" d="m0 0 32 20M32 0 0 20" />
          <path stroke="#cc3044" strokeWidth="2" d="m0 0 32 20M32 0 0 20" />
          <path stroke="#fff" strokeWidth="8" d="M16 0v20M0 10h32" />
          <path stroke="#cc3044" strokeWidth="4" d="M16 0v20M0 10h32" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Magyar"
        title="Magyar"
        aria-pressed={language === "hu"}
        onClick={() => setLanguage("hu")}
      >
        <svg viewBox="0 0 32 21" aria-hidden="true">
          <path fill="#ce3449" d="M0 0h32v7H0z" />
          <path fill="#fff" d="M0 7h32v7H0z" />
          <path fill="#477b57" d="M0 14h32v7H0z" />
        </svg>
      </button>
    </div>
  );
}

export function validateForm(form: HTMLFormElement) {
  if (!form.checkValidity()) {
    form.querySelector<HTMLElement>(":invalid")?.focus();
    throw new MessageError("errors.validation_error");
  }
}
