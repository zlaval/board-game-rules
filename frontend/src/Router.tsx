import { useEffect } from "react";
import Admin from "./App";
import Player from "./Player";
import { LanguageSwitcher, useI18n } from "./i18n";

export default function Router() {
  const { language, t } = useI18n();
  const admin = /^\/admin\/?$/.test(window.location.pathname);
  useEffect(() => {
    document.title = `${t("RuleShelf")} · ${admin ? t("Admin") : t("Ask the rules")}`;
  }, [language, t, admin]);
  return (
    <>
      <header className="app-header">
        <a href="/" className="brand">
          <svg
            className="icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
          >
            <path d="M4 4h6v16H4zM14 4h6v16h-6zM7 8h1m9 0h1" />
          </svg>
          <span>{t("RuleShelf")}</span>
        </a>
        <nav className="app-navigation" aria-label={t("Main navigation")}>
          <a href="/" aria-current={!admin ? "page" : undefined}>
            {t("Questions")}
          </a>
          <a href="/admin" aria-current={admin ? "page" : undefined}>
            {t("Admin")}
          </a>
        </nav>
        <LanguageSwitcher />
      </header>
      {admin ? <Admin /> : <Player />}
    </>
  );
}
