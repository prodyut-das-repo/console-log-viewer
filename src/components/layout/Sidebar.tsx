import type { LogFile } from "../../types";
import Icon from "../common/Icon";
import { useTranslation } from "../../i18n/LanguageProvider";

export default function Sidebar({
  logFiles,
  activeLogId,
  onSelect,
  onOpen,
}: {
  logFiles: LogFile[];
  activeLogId: string;
  onSelect: (id: string) => void;
  onOpen: () => void;
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
          <button
            className={
              activeLogId === logFile.id ? "filelink active" : "filelink"
            }
            key={logFile.id}
            onClick={() => {
              onSelect(logFile.id);
            }}
            title={logFile.name}
            type="button"
          >
            <Icon name="file" size={15} />
            <span>{logFile.name}</span>
            {activeLogId === logFile.id && <i />}
          </button>
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
