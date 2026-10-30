import type { ToolTab } from "../../types";
export const tools: Array<{
  id: ToolTab;
  label: string;
  icon: string;
  title: string;
  description: string;
}> = [
  {
    id: "console",
    label: "Console log",
    icon: ">_",
    title: "Make sense of your logs.",
    description: "A clearer view of what’s happening under the hood.",
  },
  {
    id: "formatter",
    label: "JSON formatter",
    icon: "{ }",
    title: "Format JSON with confidence.",
    description: "Validate, pretty-print, or minify JSON in your browser.",
  },
  {
    id: "escape",
    label: "Escape / unescape JSON",
    icon: "\\",
    title: "Escape or unescape JSON text.",
    description:
      "Prepare strings for JSON or turn escaped text back into readable content.",
  },
  {
    id: "har",
    label: "HAR inspector",
    icon: "⇄",
    title: "Inspect every network request.",
    description:
      "Explore request and response data from a browser network capture.",
  },
];
