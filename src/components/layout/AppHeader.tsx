import Icon from "../common/Icon";
import { languageOptions, useTranslation } from "../../i18n/LanguageProvider";
import type { Language } from "../../i18n/types";
import { usePreferences } from "../../providers/PreferencesProvider";
export default function AppHeader({
  title,
  filesOpen,
  onOpenFiles,
}: {
  title: string;
  filesOpen: boolean;
  onOpenFiles: () => void;
}) {
  const { language, setLanguage, t } = useTranslation();
  const { theme, toggleTheme } = usePreferences();
  const themeLabel = t(
    theme === "light" ? "Switch to dark mode" : "Switch to light mode",
  );
  return (
    <header>
      <div className="header-leading">
        <button
          className="mobile-menu-toggle"
          type="button"
          onClick={onOpenFiles}
          aria-label={t("Open file list")}
          aria-controls="file-navigation"
          aria-expanded={filesOpen}
          aria-haspopup="dialog"
        >
          <Icon name="menu" size={20} />
        </button>
        <div className="crumb">
          <b title={title}>{title}</b>
        </div>
      </div>
      <section>
        <small>
          <i />
          {t("Local file")}
        </small>
        <select
          className="language-select"
          value={language}
          onChange={(event) =>
            setLanguage(event.currentTarget.value as Language)
          }
          title={t("Language")}
          aria-label={t("Language")}
        >
          {languageOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={themeLabel}
          aria-label={themeLabel}
          type="button"
        >
          <Icon name={theme === "light" ? "moon" : "sun"} />
        </button>
      </section>
    </header>
  );
}
