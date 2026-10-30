import { memo } from "react";
import { useState } from "react";
import { useTranslation } from "../../i18n/LanguageProvider";
import { useClipboard } from "../../providers/ClipboardProvider";
import { formatJsonText } from "../../utils/json";
import FontSizeControl from "../../components/common/FontSizeControl";
import TextEditors from "../../components/common/TextEditors";
import StatusMessage from "../../components/common/StatusMessage";
function JsonFormatter() {
  const { t } = useTranslation();
  const { copyText } = useClipboard();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState({
    message: "JSON is parsed locally in your browser.",
    error: false,
    detail: "",
  });
  const reset = (input = "") => {
    setInput(input);
    setOutput("");
    setStatus({
      message: "JSON is parsed locally in your browser.",
      error: false,
      detail: "",
    });
  };
  const format = (compact = false) => {
    try {
      setOutput(formatJsonText(input, compact));
      setStatus({
        message: compact ? "JSON minified" : "JSON formatted",
        error: false,
        detail: "",
      });
    } catch (error) {
      setOutput("");
      setStatus({
        message: "Invalid JSON:",
        error: true,
        detail: error instanceof Error ? error.message : "",
      });
    }
  };
  return (
    <div className="utility-panel">
      <div className="utility-toolbar">
        <div>
          <strong>{t("JSON formatter")}</strong>
          <span>{t("Format or minify a JSON document")}</span>
        </div>
        <div className="utility-actions">
          <FontSizeControl
            label={`${t("JSON formatter")} · ${t("Font size")}`}
          />
          <button onClick={() => reset()} type="button">
            {t("Clear")}
          </button>
          <button
            onClick={() => void copyText(output, "Formatted JSON copied")}
            disabled={!output}
            type="button"
          >
            {t("Copy output")}
          </button>
          <button onClick={() => format(true)} type="button">
            {t("Minify")}
          </button>
          <button
            className="primary-action"
            onClick={() => format()}
            type="button"
          >
            {t("Format JSON")}
          </button>
        </div>
      </div>
      <TextEditors
        input={input}
        output={output}
        onChange={reset}
        inputLabel="Input JSON"
        placeholder={`${t("Paste JSON here, for example:")}\n{ "service": "api", "enabled": true }`}
        outputPlaceholder="Formatted JSON will appear here"
      />
      <StatusMessage {...status} />
    </div>
  );
}

export default memo(JsonFormatter);
