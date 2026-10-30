export function formatJsonText(text: string, compact = false): string {
  // Validate syntax, then format the original tokens so numbers are never
  // rounded, overflowed, or rewritten through JavaScript's Number type.
  JSON.parse(text);
  const tokens =
    text.match(
      /"(?:\\.|[^"\\])*"|[{}\[\],:]|true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
    ) ?? [];
  if (compact) return tokens.join("");

  const output: string[] = [];
  let depth = 0;
  const newline = () => output.push("\n", "  ".repeat(depth));
  tokens.forEach((token, index) => {
    if (token === "{" || token === "[") {
      output.push(token);
      depth++;
      const closing = token === "{" ? "}" : "]";
      if (tokens[index + 1] !== closing) newline();
    } else if (token === "}" || token === "]") {
      depth--;
      const opening = token === "}" ? "{" : "[";
      if (tokens[index - 1] !== opening) newline();
      output.push(token);
    } else if (token === ",") {
      output.push(token);
      newline();
    } else {
      output.push(token === ":" ? ": " : token);
    }
  });
  return output.join("");
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
