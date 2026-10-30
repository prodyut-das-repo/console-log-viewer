import type { HarEntry } from "../types";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalStrings(record: Record<string, unknown>, keys: string[]) {
  return keys.every(
    (key) => record[key] === undefined || typeof record[key] === "string",
  );
}

function optionalNumbers(record: Record<string, unknown>, keys: string[]) {
  return keys.every(
    (key) =>
      record[key] === undefined ||
      (typeof record[key] === "number" && Number.isFinite(record[key])),
  );
}

function optionalArray(value: unknown, validate: (item: unknown) => boolean) {
  return value === undefined || (Array.isArray(value) && value.every(validate));
}

function isHeader(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.value === "string"
  );
}

function isParam(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    optionalStrings(value, ["value"])
  );
}

function isPostData(value: unknown) {
  return (
    value === undefined ||
    (isRecord(value) &&
      optionalStrings(value, ["mimeType", "text"]) &&
      optionalArray(value.params, isParam))
  );
}

function isContent(value: unknown) {
  return (
    value === undefined ||
    (isRecord(value) &&
      optionalStrings(value, ["mimeType", "text", "encoding"]) &&
      optionalNumbers(value, ["size"]))
  );
}

function isEntry(value: unknown): value is HarEntry {
  if (!isRecord(value) || !isRecord(value.request) || !isRecord(value.response))
    return false;
  const { request, response } = value;
  return (
    typeof request.method === "string" &&
    typeof request.url === "string" &&
    optionalArray(request.headers, isHeader) &&
    optionalArray(request.queryString, isParam) &&
    isPostData(request.postData) &&
    optionalNumbers(request, ["headersSize", "bodySize"]) &&
    typeof response.status === "number" &&
    Number.isFinite(response.status) &&
    optionalStrings(response, ["statusText", "httpVersion", "redirectURL"]) &&
    optionalArray(response.headers, isHeader) &&
    isContent(response.content) &&
    optionalNumbers(response, ["headersSize", "bodySize"]) &&
    optionalStrings(value, [
      "startedDateTime",
      "_resourceType",
      "serverIPAddress",
      "connection",
    ]) &&
    optionalNumbers(value, ["time"]) &&
    (value.timings === undefined ||
      (isRecord(value.timings) &&
        Object.values(value.timings).every(
          (duration) =>
            typeof duration === "number" && Number.isFinite(duration),
        ))) &&
    (value.cache === undefined || isRecord(value.cache))
  );
}

export function normalizeHarEntries(value: unknown): HarEntry[] {
  // Reject the capture as a whole rather than silently omitting broken requests
  // from the inspector and comparison counts.
  return Array.isArray(value) && value.every(isEntry) ? value : [];
}
