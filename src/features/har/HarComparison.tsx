import { memo } from "react";
import { useTranslation } from "../../i18n/LanguageProvider";
import { useMemo, useState, useDeferredValue } from "react";
import type { HarCapture, HarCompareFilter } from "../../types";
import { compareHarCaptures } from "../../utils/har";
import Icon from "../../components/common/Icon";
import HarDiffList from "./HarDiffList";
import HarDiffDetails from "./HarDiffDetails";
function HarComparison({
  baseline,
  current,
}: {
  baseline: HarCapture;
  current: HarCapture;
}) {
  const { t } = useTranslation();
  const harEntries = baseline.entries;
  const harCompareEntries = current.entries;
  const harFileName = baseline.name;
  const harCompareName = current.name;
  const [harCompareQuery, setHarCompareQuery] = useState("");
  const [harCompareFilter, setHarCompareFilter] =
    useState<HarCompareFilter>("all");
  const [selectedHarDiffId, setSelectedHarDiffId] = useState("");
  const harDiffs = useMemo(
    () => compareHarCaptures(harEntries, harCompareEntries),
    [harEntries, harCompareEntries],
  );
  const indexedDiffs = useMemo(
    () =>
      harDiffs.map((diff) => {
        const entry = diff.current ?? diff.baseline;
        const searchText =
          `${entry?.request.method ?? ""} ${entry?.request.url ?? ""} ${diff.kind} ${diff.details.map((detail) => detail.label).join(" ")}`.toLowerCase();
        return { diff, searchText };
      }),
    [harDiffs],
  );
  const searchQuery = useDeferredValue(harCompareQuery.toLowerCase());
  const filteredHarDiffs = useMemo(
    () =>
      indexedDiffs
        .filter(
          ({ diff, searchText }) =>
            (harCompareFilter === "all" || diff.kind === harCompareFilter) &&
            searchText.includes(searchQuery),
        )
        .map(({ diff }) => diff),
    [indexedDiffs, harCompareFilter, searchQuery],
  );

  const selectedHarDiff =
    filteredHarDiffs.find((diff) => diff.id === selectedHarDiffId) ??
    filteredHarDiffs[0] ??
    null;
  const harDiffCounts = useMemo(
    () =>
      harDiffs.reduce<Record<Exclude<HarCompareFilter, "all">, number>>(
        (counts, diff) => {
          counts[diff.kind]++;
          return counts;
        },
        { changed: 0, added: 0, removed: 0, unchanged: 0 },
      ),
    [harDiffs],
  );

  return (
    <>
      <div className="har-summary har-compare-summary">
        <article>
          <label>{t("Changed")}</label>
          <strong>{harDiffCounts.changed}</strong>
        </article>
        <article>
          <label>{t("Added in new capture")}</label>
          <strong>{harDiffCounts.added}</strong>
        </article>
        <article>
          <label>{t("Removed from new capture")}</label>
          <strong>{harDiffCounts.removed}</strong>
        </article>
        <article>
          <label>{t("Unchanged")}</label>
          <strong>{harDiffCounts.unchanged}</strong>
        </article>
      </div>
      <div className="har-compare-toolbar">
        <label className="har-search">
          <Icon name="search" size={15} />
          <input
            value={harCompareQuery}
            onChange={(event) => setHarCompareQuery(event.currentTarget.value)}
            placeholder={t("Search compared requests...")}
            aria-label={t("Search comparison results")}
          />
        </label>
        <select
          className="har-compare-filter"
          value={harCompareFilter}
          onChange={(event) =>
            setHarCompareFilter(event.currentTarget.value as HarCompareFilter)
          }
          aria-label={t("Filter comparison results")}
        >
          <option value="all">
            {t("All changes")} ({harDiffs.length})
          </option>
          <option value="changed">
            {t("Changed")} ({harDiffCounts.changed})
          </option>
          <option value="added">
            {t("Added")} ({harDiffCounts.added})
          </option>
          <option value="removed">
            {t("Removed")} ({harDiffCounts.removed})
          </option>
          <option value="unchanged">
            {t("Unchanged")} ({harDiffCounts.unchanged})
          </option>
        </select>
      </div>
      <div className="har-compare-workspace">
        <HarDiffList
          filteredHarDiffs={filteredHarDiffs}
          selectedHarDiff={selectedHarDiff}
          setSelectedHarDiffId={setSelectedHarDiffId}
        />
        {selectedHarDiff ? (
          <HarDiffDetails
            diff={selectedHarDiff}
            harFileName={harFileName}
            harCompareName={harCompareName}
          />
        ) : (
          <div className="har-detail-placeholder">
            {t("No matching requests.")}
          </div>
        )}
      </div>
    </>
  );
}

export default memo(HarComparison);
