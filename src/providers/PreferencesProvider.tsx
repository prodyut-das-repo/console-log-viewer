import { createContext, useCallback, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import type { Theme } from "../types";
import { useStoredState } from "../hooks/useStoredState";
const validateTheme = (value: string): Theme =>
  value === "light" ? "light" : "dark";
const validateFontSize = (value: string) => {
  const size = Number(value);
  return Number.isFinite(size) && size >= 8 && size <= 20 ? size : 10;
};
interface Preferences {
  theme: Theme;
  fontSize: number;
  toggleTheme: () => void;
  changeFontSize: (delta: number) => void;
  resetFontSize: () => void;
}
const PreferencesContext = createContext<Preferences | null>(null);
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useStoredState<Theme>(
    "logscope-theme",
    "dark",
    validateTheme,
  );
  const [fontSize, setFontSize] = useStoredState(
    "logscope-log-font-size",
    10 as number,
    validateFontSize,
  );
  const toggleTheme = useCallback(
    () => setTheme((theme) => (theme === "light" ? "dark" : "light")),
    [setTheme],
  );
  const changeFontSize = useCallback(
    (delta: number) =>
      setFontSize((size) => Math.min(20, Math.max(8, size + delta))),
    [setFontSize],
  );
  const resetFontSize = useCallback(() => setFontSize(10), [setFontSize]);
  const value = useMemo(
    () => ({ theme, fontSize, toggleTheme, changeFontSize, resetFontSize }),
    [theme, fontSize, toggleTheme, changeFontSize, resetFontSize],
  );
  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}
export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("PreferencesProvider is required");
  return value;
}
