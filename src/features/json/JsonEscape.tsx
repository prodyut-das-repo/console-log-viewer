import { memo } from "react";
import { useState } from "react";
import { useTranslation } from "../../i18n/LanguageProvider";
import { useClipboard } from "../../providers/ClipboardProvider";
import { escapeJsonText, unescapeJsonText } from "../../utils/json";
import FontSizeControl from "../../components/common/FontSizeControl";
import TextEditors from "../../components/common/TextEditors";
import StatusMessage from "../../components/common/StatusMessage";
const help =
  "Escape produces JSON-safe string contents. Unescape accepts quoted JSON strings or escaped string contents.";
function JsonEscape() {
  const { t } = useTranslation();
  const { copyText } = useClipboard();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState({ message: help, error: false });
  const reset = (input = "") => {
    setInput(input);
    setOutput("");
    setStatus({ message: help, error: false });
  };
  const convert = (unescape = false) => {
    try {
      setOutput(unescape ? unescapeJsonText(input) : escapeJsonText(input));
      setStatus({
        message: unescape
          ? "JSON string unescaped"
          : "Text escaped for a JSON string",
        error: false,
      });
    } catch {
      setOutput("");
      setStatus({ message: "Invalid escaped JSON string", error: true });
    }
  };
  return (
    <div className="utility-panel">
      <div className="utility-toolbar">
        <div>
          <strong>{t("Escape / unescape JSON")}</strong>
          <span>{t("Convert quotes, line breaks, tabs, and backslashes")}</span>
        </div>
        <div className="utility-actions">
          <FontSizeControl
            label={`${t("Escape / unescape JSON")} · ${t("Font size")}`}
          />
          <button onClick={() => reset()} type="button">
            {t("Clear")}
          </button>
          <button
            onClick={() => void copyText(output, "Result copied")}
            disabled={!output}
            type="button"
          >
            {t("Copy output")}
          </button>
          <button onClick={() => convert(true)} type="button">
            {t("Unescape")}
          </button>
          <button
            className="primary-action"
            onClick={() => convert()}
            type="button"
          >
            {t("Escape text")}
          </button>
        </div>
      </div>
      <TextEditors
        input={input}
        output={output}
        onChange={reset}
        inputLabel="Input text"
        placeholder={t("Paste text or an escaped JSON string here")}
        outputPlaceholder="Escaped or unescaped text will appear here"
      />
      <StatusMessage {...status} />
    </div>
  );
}

export default memo(JsonEscape);
