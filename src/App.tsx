import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties } from "react";
import type { HarCapture, ToolTab } from "./types";
import { useTranslation } from "./i18n/LanguageProvider";
import { usePreferences } from "./providers/PreferencesProvider";
import { useClipboard } from "./providers/ClipboardProvider";
import { useLogFiles } from "./hooks/useLogFiles";
import Sidebar from "./components/layout/Sidebar";
import AppHeader from "./components/layout/AppHeader";
import ToolTabs from "./components/layout/ToolTabs";
import ToolHeading from "./components/layout/ToolHeading";
import ConsoleViewer from "./features/console/ConsoleViewer";
import ConsoleEmptyState from "./features/console/ConsoleEmptyState";
import RetryableTool from "./components/common/RetryableTool";
const loadJsonFormatter = () => import("./features/json/JsonFormatter");
const loadJsonEscape = () => import("./features/json/JsonEscape");
const loadHarInspector = () => import("./features/har/HarInspector");
export default function App() {
  const { t } = useTranslation();
  const { theme, fontSize } = usePreferences();
  const { notify } = useClipboard();
  const {
    files,
    activeFile,
    activeId,
    setActiveId,
    updateFile,
    openFiles,
    removeFile,
    replaceFile,
  } = useLogFiles();
  const [activeTool, setActiveTool] = useState<ToolTab>("console");
  const [visited, setVisited] = useState<Set<ToolTab>>(
    () => new Set(["console"]),
  );
  const [capture, setCapture] = useState<HarCapture | null>(null);
  const filePicker = useRef<HTMLInputElement>(null);
  const replacementPicker = useRef<HTMLInputElement>(null);
  const replacementTarget = useRef<string | null>(null);
  const harPicker = useRef<HTMLInputElement>(null);
  const openLogPicker = useCallback(() => filePicker.current?.click(), []);
  const openHarPicker = useCallback(() => harPicker.current?.click(), []);
  const selectTool = useCallback((tool: ToolTab) => {
    setActiveTool(tool);
    setVisited((visited) =>
      visited.has(tool) ? visited : new Set([...visited, tool]),
    );
  }, []);
  const openLogFiles = useCallback(
    async (files: File[]) => {
      if (await openFiles(files)) selectTool("console");
    },
    [openFiles, selectTool],
  );
  const selectFile = useCallback(
    (id: string) => {
      setActiveId(id);
      selectTool("console");
    },
    [setActiveId, selectTool],
  );
  const openPicker = useCallback(() => {
    if (activeTool === "har") harPicker.current?.click();
    else if (activeTool === "console" && activeId) {
      replacementTarget.current = activeId;
      replacementPicker.current?.click();
    } else openLogPicker();
  }, [activeTool, activeId, openLogPicker]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "o") {
        event.preventDefault();
        openPicker();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openPicker]);
  const openCapture = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      const { readHarCapture } = await import("./utils/har");
      setCapture(await readHarCapture(file));
      selectTool("har");
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Could not read this HAR file. Select a valid .har capture.",
      );
    }
  };
  const style = {
    "--tool-font-size": `${fontSize}px`,
    "--log-font-size": `${fontSize}px`,
  } as CSSProperties;
  const title =
    activeTool === "har"
      ? (capture?.name ?? t("HAR inspector"))
      : (activeFile?.name ?? t("Log viewer"));
  return (
    <div className="shell" data-theme={theme} style={style}>
      <Sidebar
        logFiles={files}
        activeLogId={activeId}
        onSelect={selectFile}
        onOpen={openLogPicker}
        onRemove={removeFile}
      />
      <main>
        <AppHeader title={title} />
        <ToolTabs activeTool={activeTool} onSelect={selectTool} />
        <div className="content">
          <ToolHeading
            activeTool={activeTool}
            onOpen={openPicker}
            hasLogFiles={files.length > 0}
          />
          <section
            id="panel-console"
            className="tool-panel"
            role="tabpanel"
            aria-labelledby="tab-console"
            hidden={activeTool !== "console"}
          >
            {activeFile ? (
              <ConsoleViewer
                file={activeFile}
                onUpdate={updateFile}
                onOpenFiles={openLogFiles}
                active={activeTool === "console"}
              />
            ) : (
              <ConsoleEmptyState
                onOpen={openLogPicker}
                onOpenFiles={openLogFiles}
              />
            )}
          </section>
          {visited.has("formatter") && (
            <section
              id="panel-formatter"
              className="tool-panel"
              role="tabpanel"
              aria-labelledby="tab-formatter"
              hidden={activeTool !== "formatter"}
            >
              <RetryableTool load={loadJsonFormatter}>
                {(JsonFormatter) => <JsonFormatter />}
              </RetryableTool>
            </section>
          )}
          {visited.has("escape") && (
            <section
              id="panel-escape"
              className="tool-panel"
              role="tabpanel"
              aria-labelledby="tab-escape"
              hidden={activeTool !== "escape"}
            >
              <RetryableTool load={loadJsonEscape}>
                {(JsonEscape) => <JsonEscape />}
              </RetryableTool>
            </section>
          )}
          {visited.has("har") && (
            <section
              id="panel-har"
              className="tool-panel har-panel"
              role="tabpanel"
              aria-labelledby="tab-har"
              hidden={activeTool !== "har"}
            >
              <RetryableTool load={loadHarInspector}>
                {(HarInspector) => (
                  <HarInspector
                    key={capture?.id ?? "empty"}
                    capture={capture}
                    onOpen={openHarPicker}
                  />
                )}
              </RetryableTool>
            </section>
          )}
        </div>
      </main>
      <input
        ref={filePicker}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = "";
          void openLogFiles(files);
        }}
      />
      <input
        ref={replacementPicker}
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          const id = replacementTarget.current;
          event.currentTarget.value = "";
          replacementTarget.current = null;
          if (file && id) void replaceFile(id, file);
        }}
      />
      <input
        ref={harPicker}
        type="file"
        accept=".har,application/json,.json"
        className="hidden"
        onChange={(event) => void openCapture(event)}
      />
    </div>
  );
}
