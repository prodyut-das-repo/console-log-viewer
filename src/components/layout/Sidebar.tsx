import type { LogFile } from "../../types";
import Icon from "../common/Icon";
import { useTranslation } from "../../i18n/LanguageProvider";

export default function Sidebar({
  logFiles,
  activeLogId,
  onSelect,
  onOpen,
  onRemove,
}: {
  logFiles: LogFile[];
  activeLogId: string | null;
  onSelect: (id: string) => void;
  onOpen: () => void;
  onRemove: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <aside className="side">
      <div className="brand">
        <span className="brandicon">
          <Icon name="file" size={18} />
        </span>
        logscope<span className="blue">.</span>
      </div>

      <div className="sidecap filecap">{t("LOG FILES")}</div>
      <div className="file-list" aria-label={t("LOG FILES")}>
        {logFiles.map((logFile) => (
          <div
            className={
              activeLogId === logFile.id ? "file-item active" : "file-item"
            }
            key={logFile.id}
          >
            <button
              className="filelink"
              onClick={() => onSelect(logFile.id)}
              title={logFile.name}
              aria-pressed={activeLogId === logFile.id}
              type="button"
            >
              <Icon name="file" size={15} />
              <span>{logFile.name}</span>
            </button>
            <button
              className="file-remove"
              onClick={() => onRemove(logFile.id)}
              aria-label={t("Remove {name}", { name: logFile.name })}
              title={t("Remove {name}", { name: logFile.name })}
              type="button"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}
      </div>
      <button className="filelink" onClick={() => onOpen()} type="button">
        ＋ &nbsp; {t("Add a log file")}
      </button>

      <div className="bottom">
        <div className="local">
          <i />
          {t("Files stay on your device")}
        </div>
      </div>
    </aside>
  );
}
