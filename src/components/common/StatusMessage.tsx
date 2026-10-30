import { useTranslation } from "../../i18n/LanguageProvider";
export default function StatusMessage({
  message,
  error = false,
  detail = "",
}: {
  message: string;
  error?: boolean;
  detail?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className={`utility-status${error ? " error" : ""}`} role="status">
      {t(message)}
      {detail && ` ${detail}`}
    </div>
  );
}
