import { useMemo } from "react";
import Icon from "../../components/common/Icon";
import { useTranslation } from "../../i18n/LanguageProvider";
import { useClipboard } from "../../providers/ClipboardProvider";
import type { HarEntry } from "../../types";
import { prettifyHarBody } from "../../utils/har";

export default function HarResponseBody({
  content,
}: {
  content: HarEntry["response"]["content"];
}) {
  const { t } = useTranslation();
  const { copyText } = useClipboard();
  const body = useMemo(() => {
    if (!content?.text) return "";
    return content.encoding === "base64"
      ? content.text
      : prettifyHarBody(content.text, content.mimeType);
  }, [content]);

  return (
    <>
      <div className="har-body-heading">
        <h3>
          {t("Response body")}{" "}
          <span>{content?.mimeType || t("Unknown type")}</span>
        </h3>
        <div className="utility-actions">
          <button
            className="har-body-copy"
            type="button"
            aria-label={t("Copy response body")}
            disabled={!body}
            onClick={() => void copyText(body, "Response body copied")}
          >
            <Icon name="copy" size={14} />
            {t("Copy")}
          </button>
        </div>
      </div>
      {body ? (
        <pre className="har-body">
          {content?.encoding === "base64"
            ? `[Base64 encoded content]\n${body}`
            : body}
        </pre>
      ) : (
        <p className="har-muted">
          {t("No response body was included in this capture.")}
        </p>
      )}
    </>
  );
}
