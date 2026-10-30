import { memo } from "react";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { HarDiff } from "../../types";
function HarDiffList({
  filteredHarDiffs,
  selectedHarDiff,
  setSelectedHarDiffId,
}: {
  filteredHarDiffs: HarDiff[];
  selectedHarDiff: HarDiff | null;
  setSelectedHarDiffId: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="har-diff-list" aria-label={t("HAR comparison results")}>
      {filteredHarDiffs.length ? (
        filteredHarDiffs.map((diff) => {
          const entry = diff.current ?? diff.baseline;
          let endpoint = entry?.request.url ?? "";
          try {
            const url = new URL(endpoint);
            endpoint = url.pathname + url.search;
          } catch {
            // Display the original request URL for relative entries.
          }
          return (
            <button
              className={`har-diff-row ${diff.kind}${selectedHarDiff?.id === diff.id ? " selected" : ""}`}
              key={diff.id}
              onClick={() => setSelectedHarDiffId(diff.id)}
              type="button"
            >
              <span className={`har-diff-kind ${diff.kind}`}>
                {t(diff.kind)}
              </span>
              <b className="har-method">{entry?.request.method}</b>
              <span className="har-diff-endpoint" title={entry?.request.url}>
                {endpoint}
              </span>
              <small>
                {diff.details.length
                  ? `${diff.details.length} ${t(diff.details.length === 1 ? "difference" : "differences")}`
                  : t("No detected changes")}
              </small>
            </button>
          );
        })
      ) : (
        <div className="har-no-requests">
          {t("No comparison results match this filter.")}
        </div>
      )}
    </div>
  );
}

export default memo(HarDiffList);
