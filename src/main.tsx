import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { LanguageProvider } from "./i18n/LanguageProvider";
import { PreferencesProvider } from "./providers/PreferencesProvider";
import { ClipboardProvider } from "./providers/ClipboardProvider";
import "./styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <LanguageProvider>
      <PreferencesProvider>
        <ClipboardProvider>
          <App />
        </ClipboardProvider>
      </PreferencesProvider>
    </LanguageProvider>
  </StrictMode>,
);
