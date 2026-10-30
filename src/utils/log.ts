import type { Severity } from "../types";
export function getSeverity(text: string): Severity {
  if (/\b(error|fatal|critical|exception|failed|failure)\b/i.test(text)) {
    return "error";
  }
  if (/\b(warn(?:ing)?|deprecated)\b/i.test(text)) {
    return "warn";
  }
  if (/\b(debug|trace|verbose)\b/i.test(text)) {
    return "debug";
  }
  if (/\b(info|success|ready|started|listening)\b/i.test(text)) {
    return "info";
  }
  return "default";
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export function styledSpan(
  text: string,
  color: string | null,
  bold: boolean,
): string {
  const style =
    (color ? "color:" + color + ";" : "") + (bold ? "font-weight:600;" : "");
  const attribute = style ? ' style="' + style + '"' : "";
  return "<span" + attribute + ">" + text + "</span>";
}

export function ansiToHtml(raw: string): string {
  const palette = [
    "#202a38",
    "#e26354",
    "#299c71",
    "#d19a3c",
    "#4b7fe5",
    "#a46bd6",
    "#2e9fa1",
    "#f5f7fa",
  ];
  const brightPalette = [
    "#8993a2",
    "#f1786d",
    "#49bf8c",
    "#e7b65b",
    "#7099f6",
    "#bd83ec",
    "#51bec0",
    "#fff",
  ];

  let color: string | null = null;
  let bold = false;
  let output = "";
  let lastIndex = 0;
  const ansiPattern = /\x1b\[([\d;]*)m/g;
  let match: RegExpExecArray | null;

  while ((match = ansiPattern.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      output += styledSpan(
        escapeHtml(raw.slice(lastIndex, match.index)),
        color,
        bold,
      );
    }

    for (const code of match[1].split(";").map(Number)) {
      if (code === 0) {
        color = null;
        bold = false;
      } else if (code === 1) {
        bold = true;
      } else if (code === 22) {
        bold = false;
      } else if (code >= 30 && code <= 37) {
        color = palette[code - 30];
      } else if (code >= 90 && code <= 97) {
        color = brightPalette[code - 90];
      } else if (code === 39) {
        color = null;
      }
    }

    lastIndex = ansiPattern.lastIndex;
  }

  output += styledSpan(escapeHtml(raw.slice(lastIndex)), color, bold);
  return output;
}
