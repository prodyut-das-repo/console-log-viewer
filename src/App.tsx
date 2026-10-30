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
type ToolTab = "console" | "formatter" | "escape" | "har";

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

interface HarHeader {
  name: string;
  value: string;
}

interface HarParam {
  name: string;
  value?: string;
}

interface HarPostData {
  mimeType?: string;
  text?: string;
  params?: HarParam[];
}

interface HarRequest {
  method: string;
  url: string;
  headers?: HarHeader[];
  queryString?: HarParam[];
  postData?: HarPostData;
  headersSize?: number;
  bodySize?: number;
}

interface HarResponse {
  status: number;
  statusText?: string;
  httpVersion?: string;
  headers?: HarHeader[];
  content?: {
    size?: number;
    mimeType?: string;
    text?: string;
    encoding?: string;
  };
  redirectURL?: string;
  headersSize?: number;
  bodySize?: number;
}

interface HarEntry {
  startedDateTime?: string;
  time?: number;
  request: HarRequest;
  response: HarResponse;
  timings?: Record<string, number>;
  _resourceType?: string;
  cache?: Record<string, unknown>;
  serverIPAddress?: string;
  connection?: string;
}

type HarDetailTab = "overview" | "request" | "response" | "timing";
type HarCompareFilter = "all" | "changed" | "added" | "removed" | "unchanged";

interface HarDiffDetail {
  label: string;
  before: string;
  after: string;
}

interface HarDiff {
  id: string;
  kind: Exclude<HarCompareFilter, "all">;
  baseline?: HarEntry;
  current?: HarEntry;
  details: HarDiffDetail[];
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

function FontSizeControl({
  fontSize,
  onChange,
  onReset,
  label,
}: {
  fontSize: number;
  onChange: (delta: number) => void;
  onReset: () => void;
  label: string;
}) {
  return (
    <div className="font-size-control" role="group" aria-label={label}>
      <button
        type="button"
        onClick={() => onChange(-1)}
        disabled={fontSize <= 8}
        title="Decrease text size"
        aria-label="Decrease text size"
      >
        A−
      </button>
      <button
        type="button"
        className="font-size-reset"
        onClick={onReset}
        title="Reset text size"
        aria-label={`Reset text size (currently ${fontSize} pixels)`}
      >
        {fontSize}px
      </button>
      <button
        type="button"
        onClick={() => onChange(1)}
        disabled={fontSize >= 20}
        title="Increase text size"
        aria-label="Increase text size"
      >
        A+
      </button>
    </div>
  );
}

function HarHeaders({
  title,
  headers,
}: {
  title: string;
  headers?: HarHeader[];
}) {
  return (
    <>
      <h3>
        {title} <span>{headers?.length ?? 0}</span>
      </h3>
      <div className="har-headers">
        {headers?.length ? (
          headers.map((header, index) => (
            <div key={`${header.name}-${index}`}>
              <b>{header.name}</b>
              <span>{header.value}</span>
            </div>
          ))
        ) : (
          <p>No headers in this capture.</p>
        )}
      </div>
    </>
  );
}

function HarParams({ title, params }: { title: string; params: HarParam[] }) {
  return (
    <>
      <h3>{title}</h3>
      <div className="har-headers">
        {params.map((param, index) => (
          <div key={`${param.name}-${index}`}>
            <b>{param.name}</b>
            <span>{param.value}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function getSeverity(text: string): Severity {
  if (/\b(error|fatal|critical|exception|failed|failure)\b/i.test(text)) {
    return "error";
  }
  if (/\b(warn(?:ing)?|deprecated)\b/i.test(text)) {
    return "warn";
  }
  if (/\b(debug|trace|verbose)\b/i.test(text)) {
    return "debug";
  }
  if (/\b(info|success|ready|started|listening)\b/i.test(text)) {
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

function formatDuration(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return "—";
  return milliseconds < 1000
    ? `${Math.round(milliseconds)} ms`
    : `${(milliseconds / 1000).toFixed(2)} s`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeHarEntries(value: unknown): HarEntry[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (
      !isRecord(item) ||
      !isRecord(item.request) ||
      !isRecord(item.response)
    ) {
      return [];
    }
    const request = item.request;
    const response = item.response;
    if (
      typeof request.method !== "string" ||
      typeof request.url !== "string" ||
      typeof response.status !== "number"
    ) {
      return [];
    }
    return [item as unknown as HarEntry];
  });
}

function harRequestKey(entry: HarEntry): string {
  try {
    const url = new URL(entry.request.url);
    return `${entry.request.method.toUpperCase()} ${url.origin}${url.pathname}`;
  } catch {
    return `${entry.request.method.toUpperCase()} ${entry.request.url.split(/[?#]/, 1)[0]}`;
  }
}

function compareHarCaptures(
  baseline: HarEntry[],
  current: HarEntry[],
): HarDiff[] {
  const groupByKey = (entries: HarEntry[]) => {
    const groups = new Map<string, HarEntry[]>();
    entries.forEach((entry) => {
      const key = harRequestKey(entry);
      groups.set(key, [...(groups.get(key) ?? []), entry]);
    });
    return groups;
  };
  const baselineGroups = groupByKey(baseline);
  const currentGroups = groupByKey(current);
  const keys = [
    ...new Set([...baselineGroups.keys(), ...currentGroups.keys()]),
  ];

  return keys.flatMap((key) => {
    const beforeEntries = baselineGroups.get(key) ?? [];
    const afterEntries = currentGroups.get(key) ?? [];
    return Array.from(
      { length: Math.max(beforeEntries.length, afterEntries.length) },
      (_, index) => {
        const before = beforeEntries[index];
        const after = afterEntries[index];
        const id = `${key}#${index}`;
        if (!before) {
          return {
            id,
            kind: "added" as const,
            current: after,
            details: [
              { label: "Request", before: "Not present", after: "Added" },
            ],
          };
        }
        if (!after) {
          return {
            id,
            kind: "removed" as const,
            baseline: before,
            details: [
              { label: "Request", before: "Present", after: "Removed" },
            ],
          };
        }

        const details: HarDiffDetail[] = [];
        const addChange = (
          label: string,
          oldValue: string,
          newValue: string,
        ) => {
          if (oldValue !== newValue)
            details.push({ label, before: oldValue, after: newValue });
        };
        addChange("Request URL", before.request.url, after.request.url);
        addChange(
          "Status",
          `${before.response.status} ${before.response.statusText ?? ""}`.trim(),
          `${after.response.status} ${after.response.statusText ?? ""}`.trim(),
        );
        addChange(
          "Response type",
          before.response.content?.mimeType ?? "Unknown",
          after.response.content?.mimeType ?? "Unknown",
        );
        const beforeSize =
          before.response.content?.size ?? before.response.bodySize ?? 0;
        const afterSize =
          after.response.content?.size ?? after.response.bodySize ?? 0;
        if (beforeSize !== afterSize) {
          details.push({
            label: "Response size",
            before: formatSize(beforeSize),
            after: formatSize(afterSize),
          });
        }
        const beforeTime = before.time ?? 0;
        const afterTime = after.time ?? 0;
        if (
          Math.abs(afterTime - beforeTime) >= Math.max(40, beforeTime * 0.15)
        ) {
          details.push({
            label: "Duration",
            before: formatDuration(beforeTime),
            after: formatDuration(afterTime),
          });
        }
        const beforeRequestBody =
          before.request.postData?.text ??
          JSON.stringify(before.request.postData?.params ?? []);
        const afterRequestBody =
          after.request.postData?.text ??
          JSON.stringify(after.request.postData?.params ?? []);
        if (beforeRequestBody !== afterRequestBody) {
          details.push({
            label: "Request payload",
            before: "Previous payload",
            after: "Updated payload",
          });
        }
        if (
          (before.response.content?.text ?? "") !==
          (after.response.content?.text ?? "")
        ) {
          details.push({
            label: "Response body",
            before: "Previous body",
            after: "Updated body",
          });
        }
        const headerSignature = (headers: HarHeader[] = []) =>
          JSON.stringify(
            headers
              .map(({ name, value }) => [name.toLowerCase(), value.trim()])
              .sort(([nameA], [nameB]) => nameA.localeCompare(nameB)),
          );
        if (
          headerSignature(before.request.headers) !==
          headerSignature(after.request.headers)
        ) {
          details.push({
            label: "Request headers",
            before: "Previous headers",
            after: "Updated headers",
          });
        }
        if (
          headerSignature(before.response.headers) !==
          headerSignature(after.response.headers)
        ) {
          details.push({
            label: "Response headers",
            before: "Previous headers",
            after: "Updated headers",
          });
        }
        return {
          id,
          kind: details.length ? ("changed" as const) : ("unchanged" as const),
          baseline: before,
          current: after,
          details,
        };
      },
    );
  });
}

function prettifyHarBody(text: string, mimeType = ""): string {
  const looksLikeJson = mimeType.includes("json") || /^[\s]*[\[{]/.test(text);
  if (!looksLikeJson) return text;
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
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
  const [activeTool, setActiveTool] = useState<ToolTab>("console");
  const [jsonInput, setJsonInput] = useState("");
  const [jsonOutput, setJsonOutput] = useState("");
  const [jsonStatus, setJsonStatus] = useState("");
  const [escapeInput, setEscapeInput] = useState("");
  const [escapeOutput, setEscapeOutput] = useState("");
  const [escapeStatus, setEscapeStatus] = useState("");
  const [harFileName, setHarFileName] = useState("");
  const [harEntries, setHarEntries] = useState<HarEntry[]>([]);
  const [harCompareName, setHarCompareName] = useState("");
  const [harCompareEntries, setHarCompareEntries] = useState<HarEntry[]>([]);
  const [harMode, setHarMode] = useState<"inspect" | "compare">("inspect");
  const [harCompareFilter, setHarCompareFilter] =
    useState<HarCompareFilter>("all");
  const [harCompareQuery, setHarCompareQuery] = useState("");
  const [selectedHarDiffId, setSelectedHarDiffId] = useState("");
  const [selectedHarIndex, setSelectedHarIndex] = useState<number | null>(null);
  const [harQuery, setHarQuery] = useState("");
  const [harDetailTab, setHarDetailTab] = useState<HarDetailTab>("overview");
  const [harStatus, setHarStatus] = useState("");
  const filePicker = useRef<HTMLInputElement>(null);
  const harPicker = useRef<HTMLInputElement>(null);
  const harComparePicker = useRef<HTMLInputElement>(null);
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

  const filteredHarEntries = useMemo(
    () =>
      harEntries
        .map((entry, index) => ({ entry, index }))
        .filter(({ entry }) => {
          const searchText = `${entry.request.method} ${entry.request.url} ${entry.response.status} ${entry.response.content?.mimeType ?? ""}`;
          return searchText.toLowerCase().includes(harQuery.toLowerCase());
        }),
    [harEntries, harQuery],
  );
  const selectedHarEntry =
    selectedHarIndex === null ? null : (harEntries[selectedHarIndex] ?? null);
  const harDiffs = useMemo(
    () => compareHarCaptures(harEntries, harCompareEntries),
    [harEntries, harCompareEntries],
  );
  const filteredHarDiffs = useMemo(
    () =>
      harDiffs.filter((diff) => {
        if (harCompareFilter !== "all" && diff.kind !== harCompareFilter) {
          return false;
        }
        const entry = diff.current ?? diff.baseline;
        const searchText = `${entry?.request.method ?? ""} ${entry?.request.url ?? ""} ${diff.kind} ${diff.details.map((detail) => detail.label).join(" ")}`;
        return searchText.toLowerCase().includes(harCompareQuery.toLowerCase());
      }),
    [harDiffs, harCompareFilter, harCompareQuery],
  );
  const selectedHarDiff =
    filteredHarDiffs.find((diff) => diff.id === selectedHarDiffId) ??
    filteredHarDiffs[0] ??
    null;
  const harDiffCounts = harDiffs.reduce<
    Record<Exclude<HarCompareFilter, "all">, number>
  >(
    (counts, diff) => {
      counts[diff.kind] += 1;
      return counts;
    },
    { changed: 0, added: 0, removed: 0, unchanged: 0 },
  );
  const harErrorCount = harEntries.filter(
    ({ response }) => response.status >= 400,
  ).length;
  const harTransferredBytes = harEntries.reduce(
    (total, { response }) =>
      total + Math.max(0, response.content?.size ?? response.bodySize ?? 0),
    0,
  );
  const harTotalDuration = harEntries.reduce(
    (total, { time }) => total + Math.max(0, time ?? 0),
    0,
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

  async function openHarFile(selectedFile: File | undefined): Promise<void> {
    if (!selectedFile) return;

    try {
      const parsed: unknown = JSON.parse(await selectedFile.text());
      const root = isRecord(parsed) ? parsed : null;
      const log = root && isRecord(root.log) ? root.log : null;
      const entries = normalizeHarEntries(log?.entries);
      if (!entries.length) {
        setHarStatus("This file does not contain valid HAR request entries.");
        return;
      }
      setHarFileName(selectedFile.name);
      setHarEntries(entries);
      setHarCompareName("");
      setHarCompareEntries([]);
      setHarMode("inspect");
      setSelectedHarIndex(0);
      setHarDetailTab("overview");
      setHarQuery("");
      setHarStatus("");
      setActiveTool("har");
    } catch {
      setHarStatus(
        "Could not read this HAR file. Select a valid .har capture.",
      );
    }
  }

  async function openHarCompareFile(
    selectedFile: File | undefined,
  ): Promise<void> {
    if (!selectedFile) return;

    try {
      const parsed: unknown = JSON.parse(await selectedFile.text());
      const root = isRecord(parsed) ? parsed : null;
      const log = root && isRecord(root.log) ? root.log : null;
      const entries = normalizeHarEntries(log?.entries);
      if (!entries.length) {
        setHarStatus("This file does not contain valid HAR request entries.");
        return;
      }
      setHarCompareName(selectedFile.name);
      setHarCompareEntries(entries);
      setHarMode("compare");
      setHarCompareFilter("all");
      setHarCompareQuery("");
      setSelectedHarDiffId("");
      setHarStatus("");
    } catch {
      setHarStatus(
        "Could not read this HAR file. Select a valid .har capture.",
      );
    }
  }

  async function copyLogs(): Promise<void> {
    await copyText(file.text, "Log copied to clipboard");
  }

  async function copyText(text: string, successMessage: string): Promise<void> {
    if (!text) {
      setToast("Nothing to copy");
      window.setTimeout(() => setToast(""), 2200);
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setToast(successMessage);
    } catch {
      setToast("Clipboard unavailable in this browser");
    }
    window.setTimeout(() => setToast(""), 2200);
  }

  function formatJson(compact = false): void {
    try {
      const parsed: unknown = JSON.parse(jsonInput);
      setJsonOutput(
        JSON.stringify(parsed, null, compact ? undefined : 2) ?? "",
      );
      setJsonStatus(compact ? "JSON minified" : "JSON formatted");
    } catch (error) {
      setJsonOutput("");
      setJsonStatus(
        error instanceof Error
          ? "Invalid JSON: " + error.message
          : "Invalid JSON input",
      );
    }
  }

  function escapeJsonText(): void {
    setEscapeOutput(JSON.stringify(escapeInput).slice(1, -1));
    setEscapeStatus("Text escaped for a JSON string");
  }

  function unescapeJsonText(): void {
    try {
      const parsed: unknown = JSON.parse(escapeInput);
      if (typeof parsed === "string") {
        setEscapeOutput(parsed);
        setEscapeStatus("JSON string unescaped");
        return;
      }
    } catch {
      // Try parsing the input as the contents of a quoted JSON string below.
    }

    try {
      setEscapeOutput(JSON.parse('"' + escapeInput + '"') as string);
      setEscapeStatus("JSON string unescaped");
    } catch {
      setEscapeOutput("");
      setEscapeStatus("Invalid escaped JSON string");
    }
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

  function handleHarFileChange(event: ChangeEvent<HTMLInputElement>): void {
    void openHarFile(event.currentTarget.files?.[0]);
    event.currentTarget.value = "";
  }

  function handleHarCompareFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ): void {
    void openHarCompareFile(event.currentTarget.files?.[0]);
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

  const toolHeading: Record<ToolTab, { title: string; description: string }> = {
    console: {
      title: "Make sense of your logs.",
      description: "A clearer view of what’s happening under the hood.",
    },
    formatter: {
      title: "Format JSON with confidence.",
      description: "Validate, pretty-print, or minify JSON in your browser.",
    },
    escape: {
      title: "Escape or unescape JSON text.",
      description:
        "Prepare strings for JSON or turn escaped text back into readable content.",
    },
    har: {
      title: "Inspect every network request.",
      description:
        "Explore request and response data from a browser network capture.",
    },
  };

  const logViewStyle = {
    "--log-font-size": fontSize + "px",
  } as CSSProperties;
  const toolFontStyle = {
    "--tool-font-size": fontSize + "px",
  } as CSSProperties;

  return (
    <div className="shell" data-theme={theme} style={toolFontStyle}>
      <aside className="side">
        <div className="brand">
          <span className="brandicon">
            <Icon name="file" size={18} />
          </span>
          logscope<span className="blue">.</span>
        </div>

        <div className="sidecap filecap">
          {activeTool === "har" ? "HAR CAPTURE" : "LOG FILE"}
        </div>
        <div className="filelink active">
          <Icon name="file" size={15} />
          <span>
            {activeTool === "har"
              ? harFileName || "No HAR file loaded"
              : file.name || "No file loaded"}
          </span>
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
            <b>
              {activeTool === "har"
                ? harFileName || "HAR inspector"
                : file.name || "Log viewer"}
            </b>
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

        <div className="tool-tabs" role="tablist" aria-label="Logscope tools">
          <button
            id="tab-console"
            className={
              activeTool === "console" ? "tool-tab active" : "tool-tab"
            }
            role="tab"
            aria-selected={activeTool === "console"}
            aria-controls="panel-console"
            onClick={() => setActiveTool("console")}
            type="button"
          >
            <span className="tool-tab-icon">&gt;_</span>
            Console log
          </button>
          <button
            id="tab-formatter"
            className={
              activeTool === "formatter" ? "tool-tab active" : "tool-tab"
            }
            role="tab"
            aria-selected={activeTool === "formatter"}
            aria-controls="panel-formatter"
            onClick={() => setActiveTool("formatter")}
            type="button"
          >
            <span className="tool-tab-icon">{"{ }"}</span>
            JSON formatter
          </button>
          <button
            id="tab-escape"
            className={activeTool === "escape" ? "tool-tab active" : "tool-tab"}
            role="tab"
            aria-selected={activeTool === "escape"}
            aria-controls="panel-escape"
            onClick={() => setActiveTool("escape")}
            type="button"
          >
            <span className="tool-tab-icon">\\</span>
            Escape / unescape JSON
          </button>
          <button
            id="tab-har"
            className={activeTool === "har" ? "tool-tab active" : "tool-tab"}
            role="tab"
            aria-selected={activeTool === "har"}
            aria-controls="panel-har"
            onClick={() => setActiveTool("har")}
            type="button"
          >
            <span className="tool-tab-icon">⇄</span>
            HAR inspector
          </button>
        </div>

        <div className="content">
          <div className="heading">
            <div>
              <label>
                {activeTool === "har" ? "NETWORK INSPECTOR" : "LOG EXPLORER"}{" "}
                <i />
              </label>
              <h1>{toolHeading[activeTool].title}</h1>
              <p>{toolHeading[activeTool].description}</p>
            </div>
            {(activeTool === "console" || activeTool === "har") && (
              <button
                className="upload"
                onClick={() =>
                  activeTool === "har"
                    ? harPicker.current?.click()
                    : filePicker.current?.click()
                }
                type="button"
              >
                <Icon name="upload" />
                {activeTool === "har" ? "Open HAR file" : "Upload log file"}
              </button>
            )}
          </div>

          <section
            id="panel-console"
            className="tool-panel"
            role="tabpanel"
            aria-labelledby="tab-console"
            hidden={activeTool !== "console"}
          >
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

                  <FontSizeControl
                    fontSize={fontSize}
                    onChange={changeFontSize}
                    onReset={() => setFontSize(10)}
                    label="Console log font size"
                  />

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
          </section>

          <section
            id="panel-formatter"
            className="tool-panel utility-panel"
            role="tabpanel"
            aria-labelledby="tab-formatter"
            hidden={activeTool !== "formatter"}
          >
            <div className="utility-toolbar">
              <div>
                <strong>JSON formatter</strong>
                <span>Format or minify a JSON document</span>
              </div>
              <div className="utility-actions">
                <FontSizeControl
                  fontSize={fontSize}
                  onChange={changeFontSize}
                  onReset={() => setFontSize(10)}
                  label="JSON formatter font size"
                />
                <button
                  className="secondary-action"
                  onClick={() => {
                    setJsonInput("");
                    setJsonOutput("");
                    setJsonStatus("");
                  }}
                  type="button"
                >
                  Clear
                </button>
                <button
                  className="secondary-action"
                  onClick={() =>
                    void copyText(jsonOutput, "Formatted JSON copied")
                  }
                  type="button"
                  disabled={!jsonOutput}
                >
                  Copy output
                </button>
                <button
                  className="secondary-action"
                  onClick={() => formatJson(true)}
                  type="button"
                >
                  Minify
                </button>
                <button
                  className="primary-action"
                  onClick={() => formatJson()}
                  type="button"
                >
                  Format JSON
                </button>
              </div>
            </div>
            <div className="editor-grid">
              <label className="editor-card">
                <span className="editor-label">
                  <b>Input JSON</b>
                  <small>{jsonInput.length.toLocaleString()} characters</small>
                </span>
                <textarea
                  value={jsonInput}
                  onChange={(event) => {
                    setJsonInput(event.currentTarget.value);
                    setJsonOutput("");
                    setJsonStatus("");
                  }}
                  placeholder={
                    'Paste JSON here, for example:\n{ "service": "api", "enabled": true }'
                  }
                  spellCheck={false}
                />
              </label>
              <label className="editor-card">
                <span className="editor-label">
                  <b>Result</b>
                  <small>{jsonOutput.length.toLocaleString()} characters</small>
                </span>
                <textarea
                  value={jsonOutput}
                  readOnly
                  placeholder="Formatted JSON will appear here"
                  spellCheck={false}
                />
              </label>
            </div>
            <div
              className={
                jsonStatus.startsWith("Invalid")
                  ? "utility-status error"
                  : "utility-status"
              }
              role="status"
            >
              {jsonStatus || "JSON is parsed locally in your browser."}
            </div>
          </section>

          <section
            id="panel-escape"
            className="tool-panel utility-panel"
            role="tabpanel"
            aria-labelledby="tab-escape"
            hidden={activeTool !== "escape"}
          >
            <div className="utility-toolbar">
              <div>
                <strong>Escape / unescape JSON</strong>
                <span>Convert quotes, line breaks, tabs, and backslashes</span>
              </div>
              <div className="utility-actions">
                <FontSizeControl
                  fontSize={fontSize}
                  onChange={changeFontSize}
                  onReset={() => setFontSize(10)}
                  label="Escape and unescape font size"
                />
                <button
                  className="secondary-action"
                  onClick={() => {
                    setEscapeInput("");
                    setEscapeOutput("");
                    setEscapeStatus("");
                  }}
                  type="button"
                >
                  Clear
                </button>
                <button
                  className="secondary-action"
                  onClick={() => void copyText(escapeOutput, "Result copied")}
                  type="button"
                  disabled={!escapeOutput}
                >
                  Copy output
                </button>
                <button
                  className="secondary-action"
                  onClick={unescapeJsonText}
                  type="button"
                >
                  Unescape
                </button>
                <button
                  className="primary-action"
                  onClick={escapeJsonText}
                  type="button"
                >
                  Escape text
                </button>
              </div>
            </div>
            <div className="editor-grid">
              <label className="editor-card">
                <span className="editor-label">
                  <b>Input text</b>
                  <small>
                    {escapeInput.length.toLocaleString()} characters
                  </small>
                </span>
                <textarea
                  value={escapeInput}
                  onChange={(event) => {
                    setEscapeInput(event.currentTarget.value);
                    setEscapeOutput("");
                    setEscapeStatus("");
                  }}
                  placeholder="Paste text or an escaped JSON string here"
                  spellCheck={false}
                />
              </label>
              <label className="editor-card">
                <span className="editor-label">
                  <b>Result</b>
                  <small>
                    {escapeOutput.length.toLocaleString()} characters
                  </small>
                </span>
                <textarea
                  value={escapeOutput}
                  readOnly
                  placeholder="Escaped or unescaped text will appear here"
                  spellCheck={false}
                />
              </label>
            </div>
            <div
              className={
                escapeStatus.startsWith("Invalid")
                  ? "utility-status error"
                  : "utility-status"
              }
              role="status"
            >
              {escapeStatus ||
                "Escape produces JSON-safe string contents. Unescape accepts quoted JSON strings or escaped string contents."}
            </div>
          </section>

          <section
            id="panel-har"
            className="tool-panel har-panel"
            role="tabpanel"
            aria-labelledby="tab-har"
            hidden={activeTool !== "har"}
          >
            {harEntries.length === 0 ? (
              <div className="har-empty">
                <span className="har-empty-icon">⇄</span>
                <h2>Inspect a HAR capture</h2>
                <p>
                  Open a .har file exported from your browser’s Network panel to
                  inspect requests, responses, headers, payloads, and timings.
                </p>
                <button
                  className="primary-action"
                  onClick={() => harPicker.current?.click()}
                  type="button"
                >
                  <Icon name="upload" />
                  Choose HAR file
                </button>
                {harStatus && (
                  <div className="utility-status error" role="status">
                    {harStatus}
                  </div>
                )}
                <small>
                  HAR contents are read locally and stay on your device.
                </small>
              </div>
            ) : (
              <>
                <div className="har-compare-header">
                  {harCompareEntries.length > 0 ? (
                    <div
                      className="har-mode-switch"
                      role="group"
                      aria-label="HAR view"
                    >
                      <button
                        className={harMode === "inspect" ? "active" : ""}
                        onClick={() => setHarMode("inspect")}
                        type="button"
                      >
                        Inspect capture
                      </button>
                      <button
                        className={harMode === "compare" ? "active" : ""}
                        onClick={() => setHarMode("compare")}
                        type="button"
                      >
                        Compare captures
                      </button>
                    </div>
                  ) : (
                    <span className="har-compare-hint">
                      Compare this capture with another session
                    </span>
                  )}
                  <button
                    className="har-compare-button"
                    onClick={() => harComparePicker.current?.click()}
                    type="button"
                  >
                    {harCompareName
                      ? "Replace comparison capture"
                      : "Compare with capture"}
                  </button>
                </div>
                {harMode === "compare" && harCompareEntries.length > 0 ? (
                  <>
                    <div className="har-summary har-compare-summary">
                      <article>
                        <label>Changed</label>
                        <strong>{harDiffCounts.changed}</strong>
                      </article>
                      <article>
                        <label>Added in new capture</label>
                        <strong>{harDiffCounts.added}</strong>
                      </article>
                      <article>
                        <label>Removed from new capture</label>
                        <strong>{harDiffCounts.removed}</strong>
                      </article>
                      <article>
                        <label>Unchanged</label>
                        <strong>{harDiffCounts.unchanged}</strong>
                      </article>
                    </div>
                    <div className="har-compare-toolbar">
                      <label className="har-search">
                        <Icon name="search" size={15} />
                        <input
                          value={harCompareQuery}
                          onChange={(event) =>
                            setHarCompareQuery(event.currentTarget.value)
                          }
                          placeholder="Search compared requests..."
                          aria-label="Search comparison results"
                        />
                      </label>
                      <select
                        className="har-compare-filter"
                        value={harCompareFilter}
                        onChange={(event) =>
                          setHarCompareFilter(
                            event.currentTarget.value as HarCompareFilter,
                          )
                        }
                        aria-label="Filter comparison results"
                      >
                        <option value="all">
                          All changes ({harDiffs.length})
                        </option>
                        <option value="changed">
                          Changed ({harDiffCounts.changed})
                        </option>
                        <option value="added">
                          Added ({harDiffCounts.added})
                        </option>
                        <option value="removed">
                          Removed ({harDiffCounts.removed})
                        </option>
                        <option value="unchanged">
                          Unchanged ({harDiffCounts.unchanged})
                        </option>
                      </select>
                    </div>
                    <div className="har-compare-workspace">
                      <div
                        className="har-diff-list"
                        aria-label="HAR comparison results"
                      >
                        {filteredHarDiffs.length ? (
                          filteredHarDiffs.map((diff) => {
                            const entry = diff.current ?? diff.baseline;
                            let endpoint = entry?.request.url ?? "";
                            try {
                              const url = new URL(endpoint);
                              endpoint = url.pathname + url.search;
                            } catch {
                              // Display the original request URL for relative entries.
                            }
                            return (
                              <button
                                className={`har-diff-row ${diff.kind}${selectedHarDiff?.id === diff.id ? " selected" : ""}`}
                                key={diff.id}
                                onClick={() => setSelectedHarDiffId(diff.id)}
                                type="button"
                              >
                                <span className={`har-diff-kind ${diff.kind}`}>
                                  {diff.kind}
                                </span>
                                <b className="har-method">
                                  {entry?.request.method}
                                </b>
                                <span
                                  className="har-diff-endpoint"
                                  title={entry?.request.url}
                                >
                                  {endpoint}
                                </span>
                                <small>
                                  {diff.details.length
                                    ? `${diff.details.length} ${diff.details.length === 1 ? "difference" : "differences"}`
                                    : "No detected changes"}
                                </small>
                              </button>
                            );
                          })
                        ) : (
                          <div className="har-no-requests">
                            No comparison results match this filter.
                          </div>
                        )}
                      </div>
                      {selectedHarDiff ? (
                        <div className="har-diff-detail">
                          <div className="har-diff-detail-heading">
                            <div>
                              <span
                                className={`har-diff-kind ${selectedHarDiff.kind}`}
                              >
                                {selectedHarDiff.kind}
                              </span>
                              <h2>
                                {
                                  (
                                    selectedHarDiff.current ??
                                    selectedHarDiff.baseline
                                  )?.request.method
                                }{" "}
                                request
                              </h2>
                              <p>
                                {
                                  (
                                    selectedHarDiff.current ??
                                    selectedHarDiff.baseline
                                  )?.request.url
                                }
                              </p>
                            </div>
                          </div>
                          <div className="har-diff-captures">
                            <div>
                              <b>BEFORE</b>
                              <span>{harFileName}</span>
                            </div>
                            <div>
                              <b>AFTER</b>
                              <span>{harCompareName}</span>
                            </div>
                          </div>
                          <div className="har-diff-fields">
                            {selectedHarDiff.details.map((detail) => (
                              <div
                                className="har-diff-field"
                                key={detail.label}
                              >
                                <b>{detail.label}</b>
                                <span>{detail.before}</span>
                                <span>{detail.after}</span>
                              </div>
                            ))}
                            {selectedHarDiff.kind === "unchanged" && (
                              <p className="har-muted">
                                No differences detected for this request.
                              </p>
                            )}
                          </div>
                          <div className="har-diff-legend">
                            <span>Before shows the original capture.</span>
                            <span>After shows the comparison capture.</span>
                          </div>
                        </div>
                      ) : (
                        <div className="har-detail-placeholder">
                          No matching requests.
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="har-summary">
                      <article>
                        <label>Requests</label>
                        <strong>{harEntries.length.toLocaleString()}</strong>
                      </article>
                      <article>
                        <label>Errors</label>
                        <strong className={harErrorCount ? "har-error" : ""}>
                          {harErrorCount.toLocaleString()}
                        </strong>
                      </article>
                      <article>
                        <label>Transferred</label>
                        <strong>{formatSize(harTransferredBytes)}</strong>
                      </article>
                      <article>
                        <label>Total duration</label>
                        <strong>{formatDuration(harTotalDuration)}</strong>
                      </article>
                    </div>
                    <div className="har-toolbar">
                      <div className="har-file-label">
                        <b>{harFileName}</b>
                        <span>
                          {filteredHarEntries.length} matching requests
                        </span>
                      </div>
                      <label className="har-search">
                        <Icon name="search" size={15} />
                        <input
                          value={harQuery}
                          onChange={(event) =>
                            setHarQuery(event.currentTarget.value)
                          }
                          placeholder="Filter by URL, method, status..."
                          aria-label="Filter HAR requests"
                        />
                      </label>
                    </div>
                    <div className="har-workspace">
                      <div
                        className="har-request-list"
                        aria-label="HAR requests"
                      >
                        {filteredHarEntries.length ? (
                          filteredHarEntries.map(({ entry, index }) => {
                            let endpoint = entry.request.url;
                            try {
                              const url = new URL(entry.request.url);
                              endpoint = url.pathname + url.search;
                            } catch {
                              // Keep the URL as captured if it cannot be parsed.
                            }
                            const size =
                              entry.response.content?.size ??
                              entry.response.bodySize ??
                              0;
                            return (
                              <button
                                className={
                                  "har-request" +
                                  (selectedHarIndex === index
                                    ? " selected"
                                    : "")
                                }
                                key={`${index}-${entry.request.url}`}
                                onClick={() => {
                                  setSelectedHarIndex(index);
                                  setHarDetailTab("overview");
                                }}
                                type="button"
                              >
                                <div className="har-request-topline">
                                  <b className="har-method">
                                    {entry.request.method}
                                  </b>
                                  <b
                                    className={
                                      "har-status-code" +
                                      (entry.response.status >= 400
                                        ? " bad"
                                        : entry.response.status >= 300
                                          ? " redirect"
                                          : "")
                                    }
                                  >
                                    {entry.response.status}
                                  </b>
                                </div>
                                <span
                                  className="har-endpoint"
                                  title={entry.request.url}
                                >
                                  {endpoint}
                                </span>
                                <div className="har-request-meta">
                                  <span>
                                    {entry.response.content?.mimeType ||
                                      "unknown type"}
                                  </span>
                                  <span>{formatSize(size)}</span>
                                  <span>{formatDuration(entry.time ?? 0)}</span>
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="har-no-requests">
                            No matching requests.
                          </div>
                        )}
                      </div>
                      {selectedHarEntry ? (
                        <div className="har-detail">
                          <div className="har-detail-title">
                            <div>
                              <span className="har-method large">
                                {selectedHarEntry.request.method}
                              </span>
                              <h2 title={selectedHarEntry.request.url}>
                                {selectedHarEntry.request.url}
                              </h2>
                            </div>
                            <span
                              className={
                                "har-status-pill" +
                                (selectedHarEntry.response.status >= 400
                                  ? " bad"
                                  : selectedHarEntry.response.status >= 300
                                    ? " redirect"
                                    : "")
                              }
                            >
                              {selectedHarEntry.response.status}{" "}
                              {selectedHarEntry.response.statusText}
                            </span>
                          </div>
                          <nav
                            className="har-detail-tabs"
                            aria-label="Request details"
                          >
                            {(
                              [
                                "overview",
                                "request",
                                "response",
                                "timing",
                              ] as HarDetailTab[]
                            ).map((tab) => (
                              <button
                                className={harDetailTab === tab ? "active" : ""}
                                key={tab}
                                onClick={() => setHarDetailTab(tab)}
                                type="button"
                              >
                                {tab[0].toUpperCase() + tab.slice(1)}
                              </button>
                            ))}
                          </nav>
                          <div className="har-detail-content">
                            {harDetailTab === "overview" && (
                              <>
                                <h3>General</h3>
                                <dl className="har-kv">
                                  <dt>Request URL</dt>
                                  <dd>{selectedHarEntry.request.url}</dd>
                                  <dt>Request method</dt>
                                  <dd>{selectedHarEntry.request.method}</dd>
                                  <dt>Status code</dt>
                                  <dd>
                                    {selectedHarEntry.response.status}{" "}
                                    {selectedHarEntry.response.statusText}
                                  </dd>
                                  <dt>HTTP version</dt>
                                  <dd>
                                    {selectedHarEntry.response.httpVersion ||
                                      "—"}
                                  </dd>
                                  <dt>Started</dt>
                                  <dd>
                                    {selectedHarEntry.startedDateTime
                                      ? new Date(
                                          selectedHarEntry.startedDateTime,
                                        ).toLocaleString()
                                      : "—"}
                                  </dd>
                                  <dt>Resource type</dt>
                                  <dd>
                                    {selectedHarEntry._resourceType ||
                                      selectedHarEntry.response.content
                                        ?.mimeType ||
                                      "—"}
                                  </dd>
                                  <dt>Remote address</dt>
                                  <dd>
                                    {selectedHarEntry.serverIPAddress || "—"}
                                  </dd>
                                  <dt>Duration</dt>
                                  <dd>
                                    {formatDuration(selectedHarEntry.time ?? 0)}
                                  </dd>
                                </dl>
                              </>
                            )}
                            {harDetailTab === "request" && (
                              <>
                                <HarHeaders
                                  title="Request headers"
                                  headers={selectedHarEntry.request.headers}
                                />
                                {(selectedHarEntry.request.queryString
                                  ?.length ?? 0) > 0 && (
                                  <HarParams
                                    title="Query parameters"
                                    params={
                                      selectedHarEntry.request.queryString ?? []
                                    }
                                  />
                                )}
                                {selectedHarEntry.request.postData?.text && (
                                  <>
                                    <h3>
                                      Request payload{" "}
                                      <span>
                                        {
                                          selectedHarEntry.request.postData
                                            .mimeType
                                        }
                                      </span>
                                    </h3>
                                    <pre className="har-body">
                                      {prettifyHarBody(
                                        selectedHarEntry.request.postData.text,
                                        selectedHarEntry.request.postData
                                          .mimeType,
                                      )}
                                    </pre>
                                  </>
                                )}
                              </>
                            )}
                            {harDetailTab === "response" && (
                              <>
                                <HarHeaders
                                  title="Response headers"
                                  headers={selectedHarEntry.response.headers}
                                />
                                <h3>
                                  Response body{" "}
                                  <span>
                                    {selectedHarEntry.response.content
                                      ?.mimeType || "unknown type"}
                                  </span>
                                </h3>
                                {selectedHarEntry.response.content?.text ? (
                                  <pre className="har-body">
                                    {selectedHarEntry.response.content
                                      .encoding === "base64"
                                      ? `[Base64 encoded content]\n${selectedHarEntry.response.content.text}`
                                      : prettifyHarBody(
                                          selectedHarEntry.response.content
                                            .text,
                                          selectedHarEntry.response.content
                                            .mimeType,
                                        )}
                                  </pre>
                                ) : (
                                  <p className="har-muted">
                                    No response body was included in this
                                    capture.
                                  </p>
                                )}
                              </>
                            )}
                            {harDetailTab === "timing" && (
                              <>
                                <h3>
                                  Request timing{" "}
                                  <span>
                                    {formatDuration(selectedHarEntry.time ?? 0)}{" "}
                                    total
                                  </span>
                                </h3>
                                {Object.keys(selectedHarEntry.timings ?? {})
                                  .length ? (
                                  <div className="har-timings">
                                    {Object.entries(
                                      selectedHarEntry.timings ?? {},
                                    ).map(([label, duration]) => (
                                      <div className="har-timing" key={label}>
                                        <span>{label}</span>
                                        <div>
                                          <i
                                            style={{
                                              width: `${Math.max(2, Math.min(100, (duration / Math.max(selectedHarEntry.time ?? 1, 1)) * 100))}%`,
                                            }}
                                          />
                                        </div>
                                        <b>
                                          {duration < 0
                                            ? "—"
                                            : formatDuration(duration)}
                                        </b>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="har-muted">
                                    Timing breakdown was not included in this
                                    capture.
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="har-detail-placeholder">
                          Choose a request to inspect its details.
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </section>
        </div>
      </main>

      <input
        ref={filePicker}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={harPicker}
        type="file"
        accept=".har,application/json,.json"
        className="hidden"
        onChange={handleHarFileChange}
      />
      <input
        ref={harComparePicker}
        type="file"
        accept=".har,application/json,.json"
        className="hidden"
        onChange={handleHarCompareFileChange}
      />
      <input
        ref={harComparePicker}
        type="file"
        accept=".har,application/json,.json"
        className="hidden"
        onChange={handleHarCompareFileChange}
      />
    </div>
  );
}
