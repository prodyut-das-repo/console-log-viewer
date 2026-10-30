import { useTranslation } from "../../i18n/LanguageProvider";
import type { LogFile, LogCounts } from "../../types";
import { formatSize } from "../../utils/format";
import Icon from "../../components/common/Icon";
export default function LogStats({
  file,
  lines,
  counts,
}: {
  file: LogFile;
  lines: string[];
  counts: LogCounts;
}) {
  const { t } = useTranslation();
  return (
    <div className="stats">
      <article>
        <label>
          {t("Total lines")} <i>≡</i>
        </label>
        <strong>
          {lines.length.toLocaleString()}
          <small> {t("lines")}</small>
        </strong>
        <p>{t("Across the current file")}</p>
      </article>
      <article>
        <label>
          {t("Errors")} <i className="red">!</i>
        </label>
        <strong>
          {counts.error}
          <small> {t("found")}</small>
        </strong>
        <p>{t("Needs your attention")}</p>
      </article>
      <article>
        <label>
          {t("Warnings")} <i className="amber">△</i>
        </label>
        <strong>
          {counts.warn}
          <small> {t("found")}</small>
        </strong>
        <p>{t("Worth taking a look")}</p>
      </article>
      <article>
        <label>
          {t("File size")}{" "}
          <i>
            <Icon name="file" size={15} />
          </i>
        </label>
        <strong>{formatSize(file.size)}</strong>
        <p>{file.name || t("No file selected")}</p>
      </article>
    </div>
  );
}
