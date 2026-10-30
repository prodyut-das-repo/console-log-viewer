import { memo } from "react";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { HarEntry } from "../../types";
import { formatSize, formatDuration } from "../../utils/format";
function HarRequestList({
  filteredHarEntries,
  selectedHarIndex,
  setSelectedHarIndex,
}: {
  filteredHarEntries: Array<{ entry: HarEntry; index: number }>;
  selectedHarIndex: number | null;
  setSelectedHarIndex: (index: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="har-request-list" aria-label={t("HAR requests")}>
      {filteredHarEntries.length ? (
        filteredHarEntries.map(({ entry, index }) => {
          let endpoint = entry.request.url;
          try {
            const url = new URL(entry.request.url);
            endpoint = url.pathname + url.search;
          } catch {
            // Keep the URL as captured if it cannot be parsed.
          }
          const size =
            entry.response.content?.size ?? entry.response.bodySize ?? 0;
          return (
            <button
              className={
                "har-request" + (selectedHarIndex === index ? " selected" : "")
              }
              key={`${index}-${entry.request.url}`}
              onClick={() => {
                setSelectedHarIndex(index);
              }}
              type="button"
            >
              <div className="har-request-topline">
                <b className="har-method">{entry.request.method}</b>
                <b
                  className={
                    "har-status-code" +
                    (entry.response.status >= 400
                      ? " bad"
                      : entry.response.status >= 300
                        ? " redirect"
                        : "")
                  }
                >
                  {entry.response.status}
                </b>
              </div>
              <span className="har-endpoint" title={entry.request.url}>
                {endpoint}
              </span>
              <div className="har-request-meta">
                <span>
                  {entry.response.content?.mimeType || t("Unknown type")}
                </span>
                <span>{formatSize(size)}</span>
                <span>{formatDuration(entry.time ?? 0)}</span>
              </div>
            </button>
          );
        })
      ) : (
        <div className="har-no-requests">{t("No matching requests.")}</div>
      )}
    </div>
  );
}

export default memo(HarRequestList);
