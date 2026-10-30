import { memo } from "react";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { ParsedLogEntry } from "../../types";
import Icon from "../../components/common/Icon";
function LogRows({
  visibleLines,
  wrap,
  clearFilters,
}: {
  visibleLines: ParsedLogEntry[];
  wrap: boolean;
  clearFilters: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="rows">
      {visibleLines.length ? (
        visibleLines.map(({ html, index, severity }) => (
          <div className={"row " + severity} key={index}>
            <span>{String(index + 1).padStart(3, "0")}</span>
            <i />
            <code
              className={wrap ? "wrap" : ""}
              dangerouslySetInnerHTML={{
                __html: html,
              }}
            />
          </div>
        ))
      ) : (
        <div className="empty">
          <Icon name="search" size={22} />
          <b>{t("No matching logs")}</b>
          <span>{t("Try another search or level filter.")}</span>
          <button onClick={clearFilters} type="button">
            {t("Clear filters")}
          </button>
        </div>
      )}
    </div>
  );
}
export default memo(LogRows);
