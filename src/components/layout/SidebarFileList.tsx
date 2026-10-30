import { useTranslation } from "../../i18n/LanguageProvider";
import Icon from "../common/Icon";

export default function SidebarFileList({
  label,
  addLabel,
  files,
  activeId,
  onSelect,
  onOpen,
  onRemove,
}: {
  label: string;
  addLabel: string;
  files: Array<{ id: string; name: string }>;
  activeId: string | null;
  onSelect: (id: string) => void;
  onOpen: () => void;
  onRemove: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <section className="sidebar-file-section" aria-label={t(label)}>
      <div className="sidecap filecap">{t(label)}</div>
      <div className="file-list">
        {files.map((file) => (
          <div
            className={activeId === file.id ? "file-item active" : "file-item"}
            key={file.id}
          >
            <button
              className="filelink"
              onClick={() => onSelect(file.id)}
              title={file.name}
              aria-pressed={activeId === file.id}
              type="button"
            >
              <Icon name="file" size={15} />
              <span>{file.name}</span>
            </button>
            <button
              className="file-remove"
              onClick={() => onRemove(file.id)}
              aria-label={t("Remove {name}", { name: file.name })}
              title={t("Remove {name}", { name: file.name })}
              type="button"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}
      </div>
      <button className="filelink" onClick={onOpen} type="button">
        ＋ &nbsp; {t(addLabel)}
      </button>
    </section>
  );
}
