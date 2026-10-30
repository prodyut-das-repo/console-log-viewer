import { memo } from "react";
import { useTranslation } from "../../i18n/LanguageProvider";
import { useDeferredValue, useMemo, useState } from "react";
import type { HarCapture } from "../../types";
import { formatSize, formatDuration } from "../../utils/format";
import Icon from "../../components/common/Icon";
import HarRequestList from "./HarRequestList";
import HarRequestDetails from "./HarRequestDetails";
function HarCaptureView({ capture }: { capture: HarCapture }) {
  const { t } = useTranslation();
  const harEntries = capture.entries;
  const harFileName = capture.name;
  const [harQuery, setHarQuery] = useState("");
  const [selectedHarIndex, setSelectedHarIndex] = useState<number | null>(0);
  const indexedEntries = useMemo(
    () =>
      harEntries.map((entry, index) => ({
        entry,
        index,
        searchText:
          `${entry.request.method} ${entry.request.url} ${entry.response.status} ${entry.response.content?.mimeType ?? ""}`.toLowerCase(),
      })),
    [harEntries],
  );
  const searchQuery = useDeferredValue(harQuery.toLowerCase());
  const filteredHarEntries = useMemo(
    () =>
      indexedEntries.filter(({ searchText }) =>
        searchText.includes(searchQuery),
      ),
    [indexedEntries, searchQuery],
  );
  const selected =
    filteredHarEntries.find(({ index }) => index === selectedHarIndex) ??
    filteredHarEntries[0];
  const selectedHarEntry = selected?.entry;
  const {
    errors: harErrorCount,
    bytes: harTransferredBytes,
    duration: harTotalDuration,
  } = useMemo(
    () =>
      harEntries.reduce(
        (summary, { response, time }) => ({
          errors: summary.errors + (response.status >= 400 ? 1 : 0),
          bytes:
            summary.bytes +
            Math.max(0, response.content?.size ?? response.bodySize ?? 0),
          duration: summary.duration + Math.max(0, time ?? 0),
        }),
        { errors: 0, bytes: 0, duration: 0 },
      ),
    [harEntries],
  );

  return (
    <>
      <div className="har-summary">
        <article>
          <label>{t("Requests")}</label>
          <strong>{harEntries.length.toLocaleString()}</strong>
        </article>
        <article>
          <label>{t("Errors")}</label>
          <strong className={harErrorCount ? "har-error" : ""}>
            {harErrorCount.toLocaleString()}
          </strong>
        </article>
        <article>
          <label>{t("Transferred")}</label>
          <strong>{formatSize(harTransferredBytes)}</strong>
        </article>
        <article>
          <label>{t("Total duration")}</label>
          <strong>{formatDuration(harTotalDuration)}</strong>
        </article>
      </div>
      <div className="har-toolbar">
        <div className="har-file-label">
          <b>{harFileName}</b>
          <span>
            {filteredHarEntries.length} {t("matching requests")}
          </span>
        </div>
        <label className="har-search">
          <Icon name="search" size={15} />
          <input
            value={harQuery}
            onChange={(event) => setHarQuery(event.currentTarget.value)}
            placeholder={t("Filter by URL, method, status...")}
            aria-label={t("Filter HAR requests")}
          />
        </label>
      </div>
      <div className="har-workspace">
        <HarRequestList
          filteredHarEntries={filteredHarEntries}
          selectedHarIndex={selected?.index ?? null}
          setSelectedHarIndex={setSelectedHarIndex}
        />
        {selectedHarEntry ? (
          <HarRequestDetails key={selected?.index} entry={selectedHarEntry} />
        ) : (
          <div className="har-detail-placeholder">
            {t("Choose a request to inspect its details.")}
          </div>
        )}
      </div>
    </>
  );
}

export default memo(HarCaptureView);
