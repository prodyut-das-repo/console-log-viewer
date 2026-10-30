import { lazy, Suspense, useState } from "react";
import type { ComponentType, LazyExoticComponent, ReactNode } from "react";
import ToolErrorBoundary from "./ToolErrorBoundary";
import ToolLoadError from "./ToolLoadError";
import StatusMessage from "./StatusMessage";

interface Props<P extends object> {
  load: () => Promise<{ default: ComponentType<P> }>;
  children: (Tool: LazyExoticComponent<ComponentType<P>>) => ReactNode;
}

export default function RetryableTool<P extends object>({
  load,
  children,
}: Props<P>) {
  const [attempt, setAttempt] = useState(() => ({
    Tool: lazy(load),
    number: 0,
  }));
  const retry = () => {
    // React.lazy caches rejected promises. A retry needs a fresh lazy component
    // as well as a fresh error boundary, without remounting the other panels.
    setAttempt((current) => ({ Tool: lazy(load), number: current.number + 1 }));
  };

  return (
    <ToolErrorBoundary
      key={attempt.number}
      fallback={<ToolLoadError onRetry={retry} />}
    >
      <Suspense fallback={<StatusMessage message="Loading tool..." />}>
        {children(attempt.Tool)}
      </Suspense>
    </ToolErrorBoundary>
  );
}
