import { memo } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import { useTranslation } from "../../i18n/LanguageProvider";
import { useClipboard } from "../../providers/ClipboardProvider";
import type { LogFile, LogFilter } from "../../types";
import { downloadText } from "../../utils/download";
import { useLogView } from "./useLogView";
import Icon from "../../components/common/Icon";
import LogStats from "./LogStats";
import ConsoleToolbar from "./ConsoleToolbar";
import LogRows from "./LogRows";
function ConsoleViewer({
  file,
  onUpdate,
  onOpenFiles,
  active,
}: {
  file: LogFile;
  onUpdate: (
    id: string,
    update: Partial<Pick<LogFile, "filter" | "query">>,
  ) => void;
  onOpenFiles: (files: File[]) => Promise<void>;
  active: boolean;
}) {
  const { t } = useTranslation();
  const { copyText } = useClipboard();
  const [wrap, setWrap] = useState(false);
  const [dragging, setDragging] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const filter = file.filter,
    query = file.query;
  const { lines, counts, visibleLines } = useLogView(file);
  const setQuery = useCallback(
    (query: string) => onUpdate(file.id, { query }),
    [file.id, onUpdate],
  );
  const setFilter = (next: LogFilter | ((filter: LogFilter) => LogFilter)) =>
    onUpdate(file.id, {
      filter: typeof next === "function" ? next(filter) : next,
    });
  const clearFilters = useCallback(
    () => onUpdate(file.id, { filter: "all", query: "" }),
    [file.id, onUpdate],
  );
  const copyLogs = () => copyText(file.text, "Log copied to clipboard");
  const downloadLogs = () => downloadText(file.text, file.name);
  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragging(true);
  };
  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    if (
      !(event.relatedTarget instanceof Node) ||
      !event.currentTarget.contains(event.relatedTarget)
    )
      setDragging(false);
  };
  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragging(false);
    void onOpenFiles(Array.from(event.dataTransfer.files));
  };
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInput.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);
  const filters: Array<{ id: LogFilter; label: string; count: number }> = [
    { id: "all", label: "All", count: lines.length },
    { id: "error", label: "Errors", count: counts.error },
    { id: "warn", label: "Warnings", count: counts.warn },
    { id: "info", label: "Info", count: counts.info },
    { id: "debug", label: "Debug", count: counts.debug },
  ];
  return (
    <>
      <LogStats file={file} lines={lines} counts={counts} />

      <section
        className="viewer"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <ConsoleToolbar
          file={file}
          lines={lines}
          query={query}
          setQuery={setQuery}
          wrap={wrap}
          setWrap={setWrap}
          searchInput={searchInput}
          copyLogs={copyLogs}
          downloadLogs={downloadLogs}
        />

        <nav aria-label={t("Filter logs by severity")}>
          {filters.map(({ id, label, count }) => (
            <button
              key={id}
              className={filter === id ? "on " + id : id}
              onClick={() =>
                setFilter((currentFilter) =>
                  currentFilter === id && id !== "all" ? "all" : id,
                )
              }
              type="button"
            >
              {id !== "all" && <i />}
              {t(label)}
              <small>{count}</small>
            </button>
          ))}
        </nav>

        <div className={"logview" + (dragging ? " drag" : "")}>
          <LogRows
            visibleLines={visibleLines}
            wrap={wrap}
            clearFilters={clearFilters}
          />
          {dragging && (
            <div className="drop">
              <Icon name="upload" size={24} />
              <b>{t("Drop your log file here")}</b>
              <span>{t("Any text-based log format is welcome")}</span>
            </div>
          )}
        </div>

        <footer>
          <span>
            <i />
            {t("Showing {visible} of {total} lines", {
              visible: visibleLines.length.toLocaleString(),
              total: lines.length.toLocaleString(),
            })}
          </span>
          <small>
            {t("Drop any file to open")} <kbd>⌘ O</kbd>
          </small>
        </footer>
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

export default memo(ConsoleViewer);
