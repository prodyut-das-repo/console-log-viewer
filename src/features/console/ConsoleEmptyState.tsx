import { useState } from "react";
import type { DragEvent } from "react";
import { useTranslation } from "../../i18n/LanguageProvider";
import Icon from "../../components/common/Icon";
import { FILE_SIZE_LIMIT_HINT } from "../../utils/fileLimits";

export default function ConsoleEmptyState({
  onOpen,
  onOpenFiles,
}: {
  onOpen: () => void;
  onOpenFiles: (files: File[]) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [dragging, setDragging] = useState(false);
  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    if (
      !(event.relatedTarget instanceof Node) ||
      !event.currentTarget.contains(event.relatedTarget)
    ) {
      setDragging(false);
    }
  };
  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragging(false);
    void onOpenFiles(Array.from(event.dataTransfer.files));
  };

  return (
    <>
      <section
        className={`viewer console-empty${dragging ? " drag" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="empty">
          <div className="empty-upload-icon" aria-hidden="true">
            <Icon name="upload" size={30} />
          </div>
          <b>{t("No file loaded")}</b>
          <span>{t("Drop your log file here")}</span>
          <button className="upload" onClick={onOpen} type="button">
            <Icon name="upload" />
            {t("Upload log file")}
          </button>
          <small>{t("Any text-based log format is welcome")}</small>
          <small>{t(FILE_SIZE_LIMIT_HINT)}</small>
        </div>
      </section>
      <div className="privacy">
        <span>⌑</span>
        {t(
          "Your logs are processed locally in your browser and are never uploaded to a server.",
        )}
      </div>
    </>
  );
}
