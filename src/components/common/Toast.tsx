import { useTranslation } from "../../i18n/LanguageProvider";
import { usePreferences } from "../../providers/PreferencesProvider";
export default function Toast({ message }: { message: string }) {
  const { t } = useTranslation();
  const { theme } = usePreferences();
  return (
    <div data-theme={theme}>
      <div className="toast" role="status">
        {t(message)}
      </div>
    </div>
  );
}
