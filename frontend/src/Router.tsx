import { useEffect } from "react";
import Admin from "./App";
import Player from "./Player";
import { useI18n } from "./i18n";

export default function Router() {
  const { language, t } = useI18n();
  const admin = /^\/admin\/?$/.test(window.location.pathname);
  useEffect(() => {
    document.title = `${t("RuleShelf")} · ${admin ? t("Admin") : t("Ask the rules")}`;
  }, [language, t, admin]);
  return admin ? <Admin /> : <Player />;
}
