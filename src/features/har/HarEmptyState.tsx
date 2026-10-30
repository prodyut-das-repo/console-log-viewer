import { useTranslation } from "../../i18n/LanguageProvider";
import Icon from "../../components/common/Icon";
export default function HarEmptyState({ onOpen }: { onOpen: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="har-empty">
      <span className="har-empty-icon">⇄</span>
      <h2>{t("Inspect a HAR capture")}</h2>
      <p>
        {t(
          "Open a .har file exported from your browser’s Network panel to inspect requests, responses, headers, payloads, and timings.",
        )}
      </p>
      <button className="primary-action" onClick={onOpen} type="button">
        <Icon name="upload" />
        {t("Choose HAR file")}
      </button>
      <small>
        {t("HAR contents are read locally and stay on your device.")}
      </small>
    </div>
  );
}
