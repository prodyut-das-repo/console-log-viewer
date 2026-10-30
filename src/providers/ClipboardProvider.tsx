import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import Toast from "../components/common/Toast";
interface ClipboardActions {
  copyText: (text: string, message: string) => Promise<void>;
  notify: (message: string) => void;
}
const ClipboardContext = createContext<ClipboardActions | null>(null);
export function ClipboardProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const notify = useCallback((message: string) => {
    clearTimeout(timer.current);
    setMessage(message);
    timer.current = setTimeout(() => setMessage(""), 2400);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copyText = useCallback(
    async (text: string, message: string) => {
      if (!text) {
        notify("Nothing to copy");
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        notify(message);
      } catch {
        notify("Clipboard unavailable in this browser");
      }
    },
    [notify],
  );
  const value = useMemo(() => ({ copyText, notify }), [copyText, notify]);
  return (
    <ClipboardContext.Provider value={value}>
      {children}
      {message && <Toast message={message} />}
    </ClipboardContext.Provider>
  );
}
export function useClipboard() {
  const context = useContext(ClipboardContext);
  if (!context) throw new Error("ClipboardProvider is required");
  return context;
}
