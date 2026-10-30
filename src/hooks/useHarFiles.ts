import { useCallback, useState } from "react";
import type { HarCapture } from "../types";
import { useClipboard } from "../providers/ClipboardProvider";

type HarFilesState = {
  files: HarCapture[];
  activeId: string | null;
};

export function useHarFiles() {
  const { notify } = useClipboard();
  const [{ files, activeId }, setState] = useState<HarFilesState>({
    files: [],
    activeId: null,
  });
  const activeFile = files.find((file) => file.id === activeId) ?? null;
  const selectFile = useCallback((id: string) => {
    setState((state) =>
      state.files.some((file) => file.id === id)
        ? { ...state, activeId: id }
        : state,
    );
  }, []);
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
  const openFiles = useCallback(
    async (selectedFiles: File[]) => {
      const results = await Promise.allSettled(
        selectedFiles.map(async (file) => {
          const { readHarCapture } = await import("../utils/har");
          return readHarCapture(file);
        }),
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
      const failed = results.find((result) => result.status === "rejected");
      if (failed?.status === "rejected") {
        notify(
          failed.reason instanceof Error
            ? failed.reason.message
            : "Could not read this HAR file. Select a valid .har capture.",
        );
      }
      return added.length > 0;
    },
    [notify],
  );
  return { files, activeFile, activeId, selectFile, removeFile, openFiles };
}
