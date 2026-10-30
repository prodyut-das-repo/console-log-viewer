import { useTranslation } from "../../i18n/LanguageProvider";

export default function ToolLoadError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="utility-panel tool-load-error" role="alert">
      <p>{t("Unable to open this tool.")}</p>
      <p>{t("Try again or switch to another tool.")}</p>
      <div className="utility-actions">
        <button className="primary-action" onClick={onRetry} type="button">
          {t("Try again")}
        </button>
      </div>
    </div>
  );
}
