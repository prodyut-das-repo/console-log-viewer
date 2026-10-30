import { useTranslation } from "../../i18n/LanguageProvider";
import { tools } from "./tools";
import type { ToolTab } from "../../types";
import type { KeyboardEvent } from "react";
export default function ToolTabs({
  activeTool,
  onSelect,
}: {
  activeTool: ToolTab;
  onSelect: (tool: ToolTab) => void;
}) {
  const { t } = useTranslation();
  function onKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tools.length;
    else if (event.key === "ArrowLeft")
      next = (index + tools.length - 1) % tools.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tools.length - 1;
    else return;
    event.preventDefault();
    onSelect(tools[next].id);
    document.getElementById(`tab-${tools[next].id}`)?.focus();
  }
  return (
    <div className="tool-tabs" role="tablist" aria-label={t("Logscope tools")}>
      {tools.map((tool, index) => (
        <button
          key={tool.id}
          id={`tab-${tool.id}`}
          className={`tool-tab${activeTool === tool.id ? " active" : ""}`}
          role="tab"
          tabIndex={activeTool === tool.id ? 0 : -1}
          aria-selected={activeTool === tool.id}
          aria-controls={`panel-${tool.id}`}
          onClick={() => onSelect(tool.id)}
          onKeyDown={(event) => onKey(event, index)}
          type="button"
        >
          <span className="tool-tab-icon">{tool.icon}</span>
          {t(tool.label)}
        </button>
      ))}
    </div>
  );
}
