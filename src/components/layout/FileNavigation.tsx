import { useEffect, useRef } from "react";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useTranslation } from "../../i18n/LanguageProvider";
import Sidebar from "./Sidebar";
import type { SidebarProps } from "./Sidebar";

export default function FileNavigation({
  open,
  onClose,
  ...sidebarProps
}: SidebarProps & { open: boolean; onClose: () => void }) {
  const isCompact = useMediaQuery("(max-width: 960px)");
  const dialog = useRef<HTMLDialogElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!isCompact) {
      if (open) onClose();
      return;
    }
    const element = dialog.current;
    if (open && !element?.open) element?.showModal();
    else if (!open && element?.open) element.close();
  }, [isCompact, open, onClose]);

  useEffect(() => {
    if (!isCompact || !open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isCompact, open]);

  if (!isCompact) return <Sidebar {...sidebarProps} />;

  const close = () => {
    dialog.current?.close();
    onClose();
  };
  const withClose = (action: (id: string) => void) => (id: string) => {
    close();
    action(id);
  };
  return (
    <dialog
      ref={dialog}
      id="file-navigation"
      className="file-navigation"
      aria-label={t("Files")}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <Sidebar
        {...sidebarProps}
        onClose={close}
        onSelect={withClose(sidebarProps.onSelect)}
        onSelectHar={withClose(sidebarProps.onSelectHar)}
        onOpen={() => {
          close();
          sidebarProps.onOpen();
        }}
        onOpenHar={() => {
          close();
          sidebarProps.onOpenHar();
        }}
      />
    </dialog>
  );
}
