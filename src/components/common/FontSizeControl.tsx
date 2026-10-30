import { usePreferences } from "../../providers/PreferencesProvider";
import { useTranslation } from "../../i18n/LanguageProvider";
export default function FontSizeControl({ label }: { label: string }) {
  const { fontSize, changeFontSize, resetFontSize } = usePreferences();
  const { t } = useTranslation();
  return (
    <div className="font-size-control" role="group" aria-label={label}>
      <button
        type="button"
        onClick={() => changeFontSize(-1)}
        disabled={fontSize <= 8}
        title={t("Decrease text size")}
        aria-label={t("Decrease text size")}
      >
        A−
      </button>
      <button
        type="button"
        className="font-size-reset"
        onClick={resetFontSize}
        title={t("Reset text size")}
        aria-label={`${t("Reset text size")} (${fontSize}px)`}
      >
        {fontSize}px
      </button>
      <button
        type="button"
        onClick={() => changeFontSize(1)}
        disabled={fontSize >= 20}
        title={t("Increase text size")}
        aria-label={t("Increase text size")}
      >
        A+
      </button>
    </div>
  );
}
