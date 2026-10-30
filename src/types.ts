export type Severity = "error" | "warn" | "debug" | "info" | "default";

export type LogFilter = "all" | Severity;

export type Theme = "light" | "dark";

export type ToolTab = "console" | "formatter" | "escape" | "har";

export interface LogFile {
  id: string;
  name: string;
  size: number;
  text: string;
  filter: LogFilter;
  query: string;
}

export interface LogEntry {
  text: string;
  index: number;
  severity: Severity;
}

export interface LogCounts {
  error: number;
  warn: number;
  debug: number;
  info: number;
  default: number;
}

export interface HarHeader {
  name: string;
  value: string;
}

export interface HarParam {
  name: string;
  value?: string;
}

export interface HarPostData {
  mimeType?: string;
  text?: string;
  params?: HarParam[];
}

export interface HarRequest {
  method: string;
  url: string;
  headers?: HarHeader[];
  queryString?: HarParam[];
  postData?: HarPostData;
  headersSize?: number;
  bodySize?: number;
}

export interface HarResponse {
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

export interface HarEntry {
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

export type HarDetailTab = "overview" | "request" | "response" | "timing";

export type HarCompareFilter =
  "all" | "changed" | "added" | "removed" | "unchanged";

export interface HarDiffDetail {
  label: string;
  before: string;
  after: string;
}

export interface HarDiff {
  id: string;
  kind: Exclude<HarCompareFilter, "all">;
  baseline?: HarEntry;
  current?: HarEntry;
  details: HarDiffDetail[];
}
export interface HarCapture {
  id: string;
  name: string;
  entries: HarEntry[];
}
export interface ParsedLogEntry extends LogEntry {
  html: string;
  searchText: string;
}
