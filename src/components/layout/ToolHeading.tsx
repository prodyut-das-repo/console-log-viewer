import { useTranslation } from "../../i18n/LanguageProvider";
import type { ToolTab } from "../../types";
import Icon from "../common/Icon";
import { tools } from "./tools";
export default function ToolHeading({
  activeTool,
  onOpen,
  hasLogFiles,
}: {
  activeTool: ToolTab;
  onOpen: () => void;
  hasLogFiles: boolean;
}) {
  const { t } = useTranslation();
  const tool = tools.find((tool) => tool.id === activeTool)!;
  return (
    <div className="heading">
      <div>
        <label>
          {t(activeTool === "har" ? "NETWORK INSPECTOR" : "LOG EXPLORER")} <i />
        </label>
        <h1>{t(tool.title)}</h1>
        <p>{t(tool.description)}</p>
      </div>
      {((activeTool === "console" && hasLogFiles) || activeTool === "har") && (
        <button className="upload" onClick={onOpen} type="button">
          <Icon name="upload" />
          {t(activeTool === "har" ? "Open HAR file" : "Upload log file")}
        </button>
      )}
    </div>
  );
}
