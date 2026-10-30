export function formatJsonText(text: string, compact = false): string {
  const parsed: unknown = JSON.parse(text);
  return JSON.stringify(parsed, null, compact ? undefined : 2) ?? "";
}
export function escapeJsonText(text: string): string {
  return JSON.stringify(text).slice(1, -1);
}
export function unescapeJsonText(text: string): string {
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed === "string") return parsed;
  } catch {
    /* Accept escaped string contents below. */
  }
  return JSON.parse('"' + text + '"') as string;
}
