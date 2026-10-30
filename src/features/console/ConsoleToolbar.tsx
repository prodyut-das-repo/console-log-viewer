import { useTranslation } from "../../i18n/LanguageProvider";
import type { RefObject } from "react";
import type { LogFile } from "../../types";
import { formatSize } from "../../utils/format";
import Icon from "../../components/common/Icon";
import FontSizeControl from "../../components/common/FontSizeControl";
export default function ConsoleToolbar({
  file,
  lines,
  query,
  setQuery,
  wrap,
  setWrap,
  searchInput,
  copyLogs,
  downloadLogs,
}: {
  file: LogFile;
  lines: string[];
  query: string;
  setQuery: (query: string) => void;
  wrap: boolean;
  setWrap: (next: (current: boolean) => boolean) => void;
  searchInput: RefObject<HTMLInputElement>;
  copyLogs: () => Promise<void>;
  downloadLogs: () => void;
}) {
  const { t } = useTranslation();
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) =>
    setQuery(event.currentTarget.value);
  return (
    <div className="vhead">
      <div className="ftitle">
        <i>
          <Icon name="file" />
        </i>
        <span>
          <b>{file.name || t("Log preview")}</b>
          <small>
            {formatSize(file.size)} · {lines.length.toLocaleString()}{" "}
            {t("lines")}
          </small>
        </span>
      </div>

      <div className="tools">
        <label className="search">
          <Icon name="search" size={15} />
          <input
            ref={searchInput}
            value={query}
            placeholder={t("Search logs...")}
            onChange={handleSearchChange}
            aria-label={t("Search logs")}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label={t("Clear")}
              type="button"
            >
              <Icon name="close" size={13} />
            </button>
          )}
          <kbd>⌘ K</kbd>
        </label>

        <FontSizeControl label={`${t("Console log")} · ${t("Font size")}`} />

        <button
          className={wrap ? "chosen" : ""}
          onClick={() => setWrap((currentWrap) => !currentWrap)}
          title={t("Toggle wrapping")}
          type="button"
        >
          <Icon name="wrap" size={15} />
          {t("Wrap")}
        </button>
        <button
          className="sq"
          onClick={() => void copyLogs()}
          title={t("Copy")}
          aria-label={t("Copy")}
          type="button"
        >
          <Icon name="copy" size={15} />
        </button>
        <button
          className="sq"
          onClick={downloadLogs}
          title={t("Download")}
          aria-label={t("Download")}
          type="button"
        >
          <Icon name="download" size={15} />
        </button>
      </div>
    </div>
  );
}
