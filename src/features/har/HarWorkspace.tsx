import { useEffect, useState } from "react";
import type { HarCapture } from "../../types";
import HarInspector from "./HarInspector";

export default function HarWorkspace({
  files,
  activeId,
  onOpen,
}: {
  files: HarCapture[];
  activeId: string | null;
  onOpen: () => void;
}) {
  const [visitedIds, setVisitedIds] = useState<string[]>([]);
  useEffect(() => {
    setVisitedIds((visited) => {
      const next = files
        .filter((file) => file.id === activeId || visited.includes(file.id))
        .map((file) => file.id);
      return next.length === visited.length &&
        next.every((id, index) => id === visited[index])
        ? visited
        : next;
    });
  }, [files, activeId]);

  if (!files.length) return <HarInspector capture={null} onOpen={onOpen} />;
  return files
    .filter((file) => file.id === activeId || visitedIds.includes(file.id))
    .map((file) => (
      <div key={file.id} hidden={file.id !== activeId}>
        <HarInspector capture={file} onOpen={onOpen} />
      </div>
    ));
}
