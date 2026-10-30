import { useTranslation } from "../../i18n/LanguageProvider";
import type { HarEntry } from "../../types";
import { formatDuration } from "../../utils/format";
export default function HarTiming({
  entry: selectedHarEntry,
}: {
  entry: HarEntry;
}) {
  const { t } = useTranslation();
  return (
    <>
      <h3>
        {t("Request timing")}{" "}
        <span>
          {formatDuration(selectedHarEntry.time ?? 0)} {t("total")}
        </span>
      </h3>
      {Object.keys(selectedHarEntry.timings ?? {}).length ? (
        <div className="har-timings">
          {Object.entries(selectedHarEntry.timings ?? {}).map(
            ([label, duration]) => (
              <div className="har-timing" key={label}>
                <span>{label}</span>
                <div>
                  <i
                    style={{
                      width: `${Math.max(2, Math.min(100, (duration / Math.max(selectedHarEntry.time ?? 1, 1)) * 100))}%`,
                    }}
                  />
                </div>
                <b>{duration < 0 ? "—" : formatDuration(duration)}</b>
              </div>
            ),
          )}
        </div>
      ) : (
        <p className="har-muted">
          {t("Timing breakdown was not included in this capture.")}
        </p>
      )}
    </>
  );
}
