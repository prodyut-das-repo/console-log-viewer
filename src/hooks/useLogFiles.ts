import { useCallback, useState } from "react";
import type { LogFile } from "../types";
import { useClipboard } from "../providers/ClipboardProvider";

type LogFilesState = {
  files: LogFile[];
  activeId: string | null;
};

async function readLogFile(
  file: File,
  id: string = crypto.randomUUID(),
): Promise<LogFile> {
  return {
    id,
    name: file.name || "untitled.log",
    size: file.size,
    text: await file.text(),
    filter: "all",
    query: "",
  };
}

export function useLogFiles() {
  const { notify } = useClipboard();
  const [{ files, activeId }, setState] = useState<LogFilesState>({
    files: [],
    activeId: null,
  });
  const activeFile = files.find((file) => file.id === activeId) ?? null;
  const setActiveId = useCallback((id: string) => {
    setState((state) =>
      state.files.some((file) => file.id === id)
        ? { ...state, activeId: id }
        : state,
    );
  }, []);
  const updateFile = useCallback(
    (id: string, update: Partial<Pick<LogFile, "filter" | "query">>) => {
      setState((state) => ({
        ...state,
        files: state.files.map((file) =>
          file.id === id ? { ...file, ...update } : file,
        ),
      }));
    },
    [],
  );
  const removeFile = useCallback((id: string) => {
    setState((state) => {
      const index = state.files.findIndex((file) => file.id === id);
      if (index === -1) return state;
      const files = state.files.filter((file) => file.id !== id);
      return {
        files,
        activeId:
          state.activeId === id
            ? (files[index]?.id ?? files[index - 1]?.id ?? null)
            : state.activeId,
      };
    });
  }, []);
  const replaceFile = useCallback(
    async (id: string, selectedFile: File) => {
      try {
        const replacement = await readLogFile(selectedFile, id);
        setState((state) => ({
          ...state,
          files: state.files.map((file) =>
            file.id === id ? replacement : file,
          ),
        }));
      } catch {
        notify("This file could not be read. Try another file.");
      }
    },
    [notify],
  );
  const openFiles = useCallback(
    async (selectedFiles: File[]) => {
      const results = await Promise.allSettled(
        selectedFiles.map((file) => readLogFile(file)),
      );
      const added = results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      if (added.length) {
        setState((state) => ({
          files: [...state.files, ...added],
          activeId: added[added.length - 1].id,
        }));
      }
      if (results.some((result) => result.status === "rejected"))
        notify("This file could not be read. Try another file.");
      return added.length > 0;
    },
    [notify],
  );
  return {
    files,
    activeFile,
    activeId,
    setActiveId,
    updateFile,
    openFiles,
    removeFile,
    replaceFile,
  };
}
