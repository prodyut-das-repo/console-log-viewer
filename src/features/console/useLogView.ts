import { useDeferredValue, useMemo } from "react";
import type { LogFile, LogCounts, ParsedLogEntry } from "../../types";
import { ansiToHtml, getSeverity } from "../../utils/log";
export function useLogView(file: LogFile) {
  const parsed = useMemo(() => {
    const lines = file.text.replace(/\r\n?/g, "\n").split("\n");
    const counts: LogCounts = {
      error: 0,
      warn: 0,
      info: 0,
      debug: 0,
      default: 0,
    };
    const entries: ParsedLogEntry[] = lines.map((text, index) => {
      const severity = getSeverity(text);
      counts[severity]++;
      return {
        text,
        index,
        severity,
        html: ansiToHtml(text),
        searchText: text.toLowerCase(),
      };
    });
    return { lines, counts, entries };
  }, [file.text]);
  const query = useDeferredValue(file.query.toLowerCase());
  const visibleLines = useMemo(
    () =>
      parsed.entries.filter(
        (entry) =>
          (file.filter === "all" || entry.severity === file.filter) &&
          (!query || entry.searchText.includes(query)),
      ),
    [parsed.entries, file.filter, query],
  );
  return { ...parsed, visibleLines };
}
