import type { HarEntry, HarDiff, HarDiffDetail, HarHeader } from "../types";
import { formatSize, formatDuration } from "./format";
import { formatJsonText } from "./json";
import { isRecord, normalizeHarEntries } from "./harValidation";

export function harRequestKey(entry: HarEntry): string {
  try {
    const url = new URL(entry.request.url);
    return `${entry.request.method.toUpperCase()} ${url.origin}${url.pathname}`;
  } catch {
    return `${entry.request.method.toUpperCase()} ${entry.request.url.split(/[?#]/, 1)[0]}`;
  }
}

export function compareHarCaptures(
  baseline: HarEntry[],
  current: HarEntry[],
): HarDiff[] {
  const groupByKey = (entries: HarEntry[]) => {
    const groups = new Map<string, HarEntry[]>();
    entries.forEach((entry) => {
      const key = harRequestKey(entry);
      const group = groups.get(key);
      if (group) group.push(entry);
      else groups.set(key, [entry]);
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

export function prettifyHarBody(text: string, mimeType = ""): string {
  const looksLikeJson = mimeType.includes("json") || /^[\s]*[\[{]/.test(text);
  if (!looksLikeJson) return text;
  try {
    return formatJsonText(text);
  } catch {
    return text;
  }
}

export async function readHarCapture(
  file: File,
): Promise<import("../types").HarCapture> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error(
      "Could not read this HAR file. Select a valid .har capture.",
    );
  }
  const log = isRecord(parsed) && isRecord(parsed.log) ? parsed.log : null;
  const entries = normalizeHarEntries(log?.entries);
  if (!entries.length)
    throw new Error("This file does not contain valid HAR request entries.");
  return { id: crypto.randomUUID(), name: file.name, entries };
}
