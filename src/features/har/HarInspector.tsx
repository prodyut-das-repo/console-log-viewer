import { memo } from "react";
import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { HarCapture } from "../../types";
import { useTranslation } from "../../i18n/LanguageProvider";
import { readHarCapture } from "../../utils/har";
import StatusMessage from "../../components/common/StatusMessage";
import HarEmptyState from "./HarEmptyState";
import HarCaptureView from "./HarCaptureView";
import HarComparison from "./HarComparison";
import "./har.css";
function HarInspector({
  capture,
  onOpen,
}: {
  capture: HarCapture | null;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const picker = useRef<HTMLInputElement>(null);
  const [comparison, setComparison] = useState<HarCapture | null>(null);
  const [mode, setMode] = useState<"inspect" | "compare">("inspect");
  const [error, setError] = useState("");
  async function openComparison(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      const capture = await readHarCapture(file);
      setComparison(capture);
      setMode("compare");
      setError("");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not read this HAR file. Select a valid .har capture.",
      );
    }
  }
  if (!capture) return <HarEmptyState onOpen={onOpen} />;
  return (
    <>
      <div className="har-compare-header">
        {comparison ? (
          <div
            className="har-mode-switch"
            role="group"
            aria-label={t("HAR view")}
          >
            <button
              className={mode === "inspect" ? "active" : ""}
              onClick={() => setMode("inspect")}
              type="button"
            >
              {t("Inspect capture")}
            </button>
            <button
              className={mode === "compare" ? "active" : ""}
              onClick={() => setMode("compare")}
              type="button"
            >
              {t("Compare captures")}
            </button>
          </div>
        ) : (
          <span className="har-compare-hint">
            {t("Compare this capture with another session")}
          </span>
        )}
        <button
          className="har-compare-button"
          onClick={() => picker.current?.click()}
          type="button"
        >
          {t(
            comparison ? "Replace comparison capture" : "Compare with capture",
          )}
        </button>
      </div>
      {error && <StatusMessage message={error} error />}
      <div hidden={mode !== "inspect"}>
        <HarCaptureView capture={capture} />
      </div>
      {comparison && (
        <div hidden={mode !== "compare"}>
          <HarComparison
            key={comparison.id}
            baseline={capture}
            current={comparison}
          />
        </div>
      )}
      <input
        ref={picker}
        type="file"
        accept=".har,application/json,.json"
        className="hidden"
        onChange={(event) => void openComparison(event)}
      />
    </>
  );
}

export default memo(HarInspector);
