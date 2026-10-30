import { memo } from "react";
import { useTranslation } from "../../i18n/LanguageProvider";
import type { HarDiff } from "../../types";
function HarDiffDetails({
  diff: selectedHarDiff,
  harFileName,
  harCompareName,
}: {
  diff: HarDiff;
  harFileName: string;
  harCompareName: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="har-diff-detail">
      <div className="har-diff-detail-heading">
        <div>
          <span className={`har-diff-kind ${selectedHarDiff.kind}`}>
            {t(selectedHarDiff.kind)}
          </span>
          <h2>
            {
              (selectedHarDiff.current ?? selectedHarDiff.baseline)?.request
                .method
            }{" "}
            {t("Request")}
          </h2>
          <p>
            {(selectedHarDiff.current ?? selectedHarDiff.baseline)?.request.url}
          </p>
        </div>
      </div>
      <div className="har-diff-captures">
        <div>
          <b>{t("BEFORE")}</b>
          <span>{harFileName}</span>
        </div>
        <div>
          <b>{t("AFTER")}</b>
          <span>{harCompareName}</span>
        </div>
      </div>
      <div className="har-diff-fields">
        {selectedHarDiff.details.map((detail) => (
          <div className="har-diff-field" key={detail.label}>
            <b>{t(detail.label)}</b>
            <span>{t(detail.before)}</span>
            <span>{t(detail.after)}</span>
          </div>
        ))}
        {selectedHarDiff.kind === "unchanged" && (
          <p className="har-muted">
            {t("No differences detected for this request.")}
          </p>
        )}
      </div>
      <div className="har-diff-legend">
        <span>{t("Before shows the original capture.")}</span>
        <span>{t("After shows the comparison capture.")}</span>
      </div>
    </div>
  );
}

export default memo(HarDiffDetails);
