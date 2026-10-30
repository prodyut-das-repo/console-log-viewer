import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, DragEvent, ReactNode } from "react";

const demoLogs = `2024-08-21T09:41:02.118Z  INFO  [app] Starting application v2.8.1
2024-08-21T09:41:02.142Z  INFO  [config] Environment: production
2024-08-21T09:41:02.204Z  DEBUG [database] Connecting to postgresql://db.internal:5432/app
2024-08-21T09:41:02.481Z  INFO  [database] Connection pool ready { min: 2, max: 10 }
2024-08-21T09:41:03.006Z  INFO  [http] Server listening on :8080
2024-08-21T09:41:08.317Z  INFO  [request] GET /api/v1/users 200 · 42ms
2024-08-21T09:41:09.028Z  WARN  [auth] Token expires in 5 minutes for user #usr_8K2D
2024-08-21T09:41:11.771Z  INFO  [request] POST /api/v1/events 201 · 126ms
2024-08-21T09:41:12.002Z  ERROR [payments] Gateway timeout after 3000ms
    at request (src/services/gateway.js:84:12)
    at async processPayment (src/services/payments.js:129:18)
2024-08-21T09:41:12.004Z  DEBUG [retry] Attempt 1/3 scheduled in 500ms
2024-08-21T09:41:12.518Z  INFO  [payments] Retry succeeded · txn_4f2c91
2024-08-21T09:41:18.905Z  INFO  [request] GET /api/v1/health 200 · 8ms
2024-08-21T09:41:20.112Z  WARN  [cache] Hit rate below threshold: 67.4%
2024-08-21T09:41:23.441Z  INFO  [worker] Queue drained · 24 jobs processed
2024-08-21T09:41:24.000Z  INFO  [app] Ready in 1.88s`;

type Severity = "error" | "warn" | "debug" | "info" | "default";
type LogFilter = "all" | Severity;
type Theme = "light" | "dark";

interface LogFile {
  name: string;
  size: number;
  text: string;
}

interface LogEntry {
  text: string;
  index: number;
  severity: Severity;
}

interface LogCounts {
  error: number;
  warn: number;
  debug: number;
  info: number;
  default: number;
}

const icons = {
  upload: (
    <>
      <path d="M12 16V4m-4 4 4-4 4 4" />
      <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
    </>
  ),
  file: (
    <>
      <path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10z" />
      <path d="M13 3v7h7M8 14h8" />
    </>
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12m-4-4 4 4 4-4" />
      <path d="M5 17v3h14v-3" />
    </>
  ),
  wrap: (
    <>
      <path d="M4 7h16M4 12h11a3 3 0 1 1 0 6h-2m0 0 3-3m-3 3 3 3" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
    </>
  ),
  moon: <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5m0-8h.01" />
    </>
  ),
  close: <path d="m18 6-12 12M6 6l12 12" />,
} satisfies Record<string, ReactNode>;

type IconName = keyof typeof icons;

function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  );
}

function getSeverity(text: string): Severity {
  if (/(error|fatal|critical|exception|failed|failure)/i.test(text)) {
    return "error";
  }
  if (/(warn(?:ing)?|deprecated)/i.test(text)) {
    return "warn";
  }
  if (/(debug|trace|verbose)/i.test(text)) {
    return "debug";
  }
  if (/(info|success|ready|started|listening)/i.test(text)) {
    return "info";
  }
  return "default";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return bytes + " B";
  }
  if (bytes < 1048576) {
    return (bytes / 1024).toFixed(1) + " KB";
  }
  return (bytes / 1048576).toFixed(2) + " MB";
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function styledSpan(text: string, color: string | null, bold: boolean): string {
  const style =
    (color ? "color:" + color + ";" : "") + (bold ? "font-weight:600;" : "");
  const attribute = style ? ' style="' + style + '"' : "";
  return "<span" + attribute + ">" + text + "</span>";
}

function ansiToHtml(raw: string): string {
  const palette = [
    "#202a38",
    "#e26354",
    "#299c71",
    "#d19a3c",
    "#4b7fe5",
    "#a46bd6",
    "#2e9fa1",
    "#f5f7fa",
  ];
  const brightPalette = [
    "#8993a2",
    "#f1786d",
    "#49bf8c",
    "#e7b65b",
    "#7099f6",
    "#bd83ec",
    "#51bec0",
    "#fff",
  ];

  let color: string | null = null;
  let bold = false;
  let output = "";
  let lastIndex = 0;
  const ansiPattern = /\x1b\[([\d;]*)m/g;
  let match: RegExpExecArray | null;

  while ((match = ansiPattern.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      output += styledSpan(
        escapeHtml(raw.slice(lastIndex, match.index)),
        color,
        bold,
      );
    }

    for (const code of match[1].split(";").map(Number)) {
      if (code === 0) {
        color = null;
        bold = false;
      } else if (code === 1) {
        bold = true;
      } else if (code === 22) {
        bold = false;
      } else if (code >= 30 && code <= 37) {
        color = palette[code - 30];
      } else if (code >= 90 && code <= 97) {
        color = brightPalette[code - 90];
      } else if (code === 39) {
        color = null;
      }
    }

    lastIndex = ansiPattern.lastIndex;
  }

  output += styledSpan(escapeHtml(raw.slice(lastIndex)), color, bold);
  return output;
}

function getInitialTheme(): Theme {
  return localStorage.getItem("logscope-theme") === "light" ? "light" : "dark";
}

function getInitialFontSize(): number {
  const savedSize = Number(localStorage.getItem("logscope-log-font-size"));

  return Number.isFinite(savedSize) && savedSize >= 8 && savedSize <= 20
    ? savedSize
    : 10;
}

export default function App() {
  const [file, setFile] = useState<LogFile>({
    name: "production-api.log",
    size: new Blob([demoLogs]).size,
    text: demoLogs,
  });
  const [filter, setFilter] = useState<LogFilter>("all");
  const [query, setQuery] = useState("");
  const [wrap, setWrap] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [toast, setToast] = useState("");
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [fontSize, setFontSize] = useState<number>(getInitialFontSize);
  const filePicker = useRef<HTMLInputElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  const lines = useMemo(
    () => file.text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n"),
    [file],
  );

  const counts = useMemo(
    () =>
      lines.reduce<LogCounts>(
        (result, line) => {
          result[getSeverity(line)] += 1;
          return result;
        },
        { error: 0, warn: 0, debug: 0, info: 0, default: 0 },
      ),
    [lines],
  );

  const visibleLines = useMemo<LogEntry[]>(
    () =>
      lines
        .map((text, index) => ({
          text,
          index,
          severity: getSeverity(text),
        }))
        .filter(
          (entry) =>
            (filter === "all" || entry.severity === filter) &&
            (!query || entry.text.toLowerCase().includes(query.toLowerCase())),
        ),
    [lines, filter, query],
  );

  useEffect(() => {
    localStorage.setItem("logscope-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("logscope-log-font-size", String(fontSize));
  }, [fontSize]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInput.current?.focus();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "o") {
        event.preventDefault();
        filePicker.current?.click();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function openFile(selectedFile: File | undefined): Promise<void> {
    if (!selectedFile) {
      return;
    }

    try {
      const text = await selectedFile.text();
      setFile({
        name: selectedFile.name || "untitled.log",
        size: selectedFile.size,
        text,
      });
      setFilter("all");
      setQuery("");
      setToast("");
    } catch {
      setToast("This file could not be read. Try another file.");
    }
  }

  async function copyLogs(): Promise<void> {
    try {
      await navigator.clipboard.writeText(file.text);
      setToast("Copied to clipboard");
    } catch {
      setToast("Clipboard unavailable in this browser");
    }
    window.setTimeout(() => setToast(""), 2200);
  }

  function downloadLogs(): void {
    const objectUrl = URL.createObjectURL(
      new Blob([file.text], { type: "text/plain" }),
    );
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = file.name;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>): void {
    setQuery(event.currentTarget.value);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    void openFile(event.currentTarget.files?.[0]);
    event.currentTarget.value = "";
  }

  function handleDragOver(event: DragEvent<HTMLElement>): void {
    event.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLElement>): void {
    const nextTarget = event.relatedTarget;
    if (
      !(nextTarget instanceof Node) ||
      !event.currentTarget.contains(nextTarget)
    ) {
      setDragging(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLElement>): void {
    event.preventDefault();
    setDragging(false);
    void openFile(event.dataTransfer.files.item(0) ?? undefined);
  }

  function changeFontSize(delta: number): void {
    setFontSize((currentSize) =>
      Math.min(20, Math.max(8, currentSize + delta)),
    );
  }

  function clearFilters(): void {
    setQuery("");
    setFilter("all");
  }

  const filters: Array<{
    id: LogFilter;
    label: string;
    count: number;
  }> = [
    { id: "all", label: "All", count: lines.length },
    { id: "error", label: "Errors", count: counts.error },
    { id: "warn", label: "Warnings", count: counts.warn },
    { id: "info", label: "Info", count: counts.info },
    { id: "debug", label: "Debug", count: counts.debug },
  ];

  const logViewStyle = {
    "--log-font-size": fontSize + "px",
  } as CSSProperties;

  return (
    <div className="shell" data-theme={theme}>
      <aside className="side">
        <div className="brand">
          <span className="brandicon">
            <Icon name="file" size={18} />
          </span>
          logscope<span className="blue">.</span>
        </div>

        <div className="sidecap filecap">LOG FILE</div>
        <div className="filelink active">
          <Icon name="file" size={15} />
          <span>{file.name || "No file loaded"}</span>
          <i />
        </div>
        <button
          className="filelink"
          onClick={() => filePicker.current?.click()}
          type="button"
        >
          ＋ &nbsp; Add a log file
        </button>

        <div className="bottom">
          <div className="local">
            <i />
            Files stay on your device
          </div>
        </div>
      </aside>

      <main>
        <header>
          <div className="crumb">
            <b>{file.name || "Log viewer"}</b>
          </div>
          <section>
            <small>
              <i />
              Local file
            </small>
            <button
              className="theme-toggle"
              onClick={() =>
                setTheme((currentTheme) =>
                  currentTheme === "light" ? "dark" : "light",
                )
              }
              title={
                theme === "light"
                  ? "Switch to dark mode"
                  : "Switch to light mode"
              }
              aria-label={
                theme === "light"
                  ? "Switch to dark mode"
                  : "Switch to light mode"
              }
              type="button"
            >
              <Icon name={theme === "light" ? "moon" : "sun"} />
            </button>
          </section>
        </header>

        <div className="content">
          <div className="heading">
            <div>
              <label>
                LOG EXPLORER <i />
              </label>
              <h1>Make sense of your logs.</h1>
              <p>A clearer view of what’s happening under the hood.</p>
            </div>
            <button
              className="upload"
              onClick={() => filePicker.current?.click()}
              type="button"
            >
              <Icon name="upload" />
              Upload log file
            </button>
          </div>

          <div className="stats">
            <article>
              <label>
                Total lines <i>≡</i>
              </label>
              <strong>
                {lines.length.toLocaleString()}
                <small> lines</small>
              </strong>
              <p>Across the current file</p>
            </article>
            <article>
              <label>
                Errors <i className="red">!</i>
              </label>
              <strong>
                {counts.error}
                <small> found</small>
              </strong>
              <p>Needs your attention</p>
            </article>
            <article>
              <label>
                Warnings <i className="amber">△</i>
              </label>
              <strong>
                {counts.warn}
                <small> found</small>
              </strong>
              <p>Worth taking a look</p>
            </article>
            <article>
              <label>
                File size{" "}
                <i>
                  <Icon name="file" size={15} />
                </i>
              </label>
              <strong>{formatSize(file.size)}</strong>
              <p>{file.name || "No file selected"}</p>
            </article>
          </div>

          <section
            className="viewer"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="vhead">
              <div className="ftitle">
                <i>
                  <Icon name="file" />
                </i>
                <span>
                  <b>{file.name || "Log preview"}</b>
                  <small>
                    {formatSize(file.size)} · {lines.length.toLocaleString()}{" "}
                    lines
                  </small>
                </span>
              </div>

              <div className="tools">
                <label className="search">
                  <Icon name="search" size={15} />
                  <input
                    ref={searchInput}
                    value={query}
                    placeholder="Search logs..."
                    onChange={handleSearchChange}
                    aria-label="Search logs"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery("")}
                      aria-label="Clear"
                      type="button"
                    >
                      <Icon name="close" size={13} />
                    </button>
                  )}
                  <kbd>⌘ K</kbd>
                </label>

                <div
                  className="font-size-control"
                  role="group"
                  aria-label="Console log font size"
                >
                  <button
                    type="button"
                    onClick={() => changeFontSize(-1)}
                    disabled={fontSize <= 8}
                    title="Decrease log text size"
                    aria-label="Decrease log text size"
                  >
                    A−
                  </button>
                  <button
                    type="button"
                    className="font-size-reset"
                    onClick={() => setFontSize(10)}
                    title="Reset log text size"
                    aria-label={
                      "Reset log text size (currently " + fontSize + " pixels)"
                    }
                  >
                    {fontSize}px
                  </button>
                  <button
                    type="button"
                    onClick={() => changeFontSize(1)}
                    disabled={fontSize >= 20}
                    title="Increase log text size"
                    aria-label="Increase log text size"
                  >
                    A+
                  </button>
                </div>

                <button
                  className={wrap ? "chosen" : ""}
                  onClick={() => setWrap((currentWrap) => !currentWrap)}
                  title="Toggle wrapping"
                  type="button"
                >
                  <Icon name="wrap" size={15} />
                  Wrap
                </button>
                <button
                  className="sq"
                  onClick={() => void copyLogs()}
                  title="Copy"
                  aria-label="Copy"
                  type="button"
                >
                  <Icon name="copy" size={15} />
                </button>
                <button
                  className="sq"
                  onClick={downloadLogs}
                  title="Download"
                  aria-label="Download"
                  type="button"
                >
                  <Icon name="download" size={15} />
                </button>
              </div>
            </div>

            <nav aria-label="Filter logs by severity">
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
                  {label}
                  <small>{count}</small>
                </button>
              ))}
            </nav>

            <div
              className={"logview" + (dragging ? " drag" : "")}
              style={logViewStyle}
            >
              <div className="rows">
                {visibleLines.length ? (
                  visibleLines.map(({ text, index, severity }) => (
                    <div className={"row " + severity} key={index}>
                      <span>{String(index + 1).padStart(3, "0")}</span>
                      <i />
                      <code
                        className={wrap ? "wrap" : ""}
                        dangerouslySetInnerHTML={{
                          __html: ansiToHtml(text),
                        }}
                      />
                    </div>
                  ))
                ) : (
                  <div className="empty">
                    <Icon name="search" size={22} />
                    <b>No matching logs</b>
                    <span>Try another search or level filter.</span>
                    <button onClick={clearFilters} type="button">
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
              {dragging && (
                <div className="drop">
                  <Icon name="upload" size={24} />
                  <b>Drop your log file here</b>
                  <span>Any text-based log format is welcome</span>
                </div>
              )}
            </div>

            <footer>
              <span>
                <i />
                Showing <b>{visibleLines.length.toLocaleString()}</b> of{" "}
                {lines.length.toLocaleString()} lines
              </span>
              <small>
                Drop any file to open <kbd>⌘ O</kbd>
              </small>
            </footer>
          </section>

          {toast && (
            <div className="toast" role="status">
              {toast}
            </div>
          )}

          <div className="privacy">
            <span>⌑</span>
            Your logs are processed locally in your browser and are never
            uploaded to a server.
          </div>
        </div>
      </main>

      <input
        ref={filePicker}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
