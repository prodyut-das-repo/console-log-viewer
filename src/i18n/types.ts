import type english from "./locales/en";
export type Language = "en" | "bn" | "te" | "ta" | "kn";
export type MessageKey = keyof typeof english;
export type Messages = Record<MessageKey, string>;
export type Translate = (
  message: string,
  values?: Record<string, string | number>,
) => string;
