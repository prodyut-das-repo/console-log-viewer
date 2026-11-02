import type { HarCapture, LogFile } from "../../types";
import Icon from "../common/Icon";
import { useTranslation } from "../../i18n/LanguageProvider";
import SidebarFileList from "./SidebarFileList";

export interface SidebarProps {
  logFiles: LogFile[];
  activeLogId: string | null;
  onSelect: (id: string) => void;
  onOpen: () => void;
  onRemove: (id: string) => void;
  harFiles: HarCapture[];
  activeHarId: string | null;
  onSelectHar: (id: string) => void;
  onOpenHar: () => void;
  onRemoveHar: (id: string) => void;
  onClose?: () => void;
}

export default function Sidebar({
  logFiles,
  activeLogId,
  onSelect,
  onOpen,
  onRemove,
  harFiles,
  activeHarId,
  onSelectHar,
  onOpenHar,
  onRemoveHar,
  onClose,
}: SidebarProps) {
  const { t } = useTranslation();
  return (
    <aside className="side">
      <div className="sidebar-header">
        {onClose && (
          <button
            className="sidebar-close"
            type="button"
            onClick={onClose}
            aria-label={t("Close file list")}
          >
            <Icon name="close" size={20} />
          </button>
        )}
        <div className="brand">
          <img
            className="brand-logo"
            src="/assets/logscope-logo.png"
            alt="Logscope"
            width={2149}
            height={731}
          />
        </div>
      </div>

      <div className="sidebar-files">
        <SidebarFileList
          label="LOG FILES"
          addLabel="Add a log file"
          files={logFiles}
          activeId={activeLogId}
          onSelect={onSelect}
          onOpen={onOpen}
          onRemove={onRemove}
        />
        <SidebarFileList
          label="HAR FILES"
          addLabel="Add a HAR file"
          files={harFiles}
          activeId={activeHarId}
          onSelect={onSelectHar}
          onOpen={onOpenHar}
          onRemove={onRemoveHar}
        />
      </div>

      <div className="bottom">
        <div className="local">
          <i />
          {t("Files stay on your device")}
        </div>
      </div>
    </aside>
  );
}
