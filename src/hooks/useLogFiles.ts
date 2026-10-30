import { useCallback, useState } from "react";
import type { LogFile } from "../types";
import { demoLogs } from "../data/demoLogs";
import { useClipboard } from "../providers/ClipboardProvider";

export function useLogFiles() {
  const { notify } = useClipboard();
  const [files, setFiles] = useState<LogFile[]>(() => [
    {
      id: "demo",
      name: "production-api.log",
      size: new Blob([demoLogs]).size,
      text: demoLogs,
      filter: "all",
      query: "",
    },
  ]);
  const [activeId, setActiveId] = useState("demo");
  const activeFile = files.find((file) => file.id === activeId) ?? files[0];
  const updateFile = useCallback(
    (id: string, update: Partial<Pick<LogFile, "filter" | "query">>) => {
      setFiles((files) =>
        files.map((file) => (file.id === id ? { ...file, ...update } : file)),
      );
    },
    [],
  );
  const openFiles = useCallback(
    async (selectedFiles: File[]) => {
      const results = await Promise.allSettled(
        selectedFiles.map(async (file) => ({
          id: crypto.randomUUID(),
          name: file.name || "untitled.log",
          size: file.size,
          text: await file.text(),
          filter: "all" as const,
          query: "",
        })),
      );
      const added = results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      if (added.length) {
        setFiles((files) => [...files, ...added]);
        setActiveId(added[added.length - 1].id);
      }
      if (results.some((result) => result.status === "rejected"))
        notify("This file could not be read. Try another file.");
      return added.length > 0;
    },
    [notify],
  );
  return { files, activeFile, activeId, setActiveId, updateFile, openFiles };
}
