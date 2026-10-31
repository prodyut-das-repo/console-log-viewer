const TEXT_EXTENSIONS = new Set([
  ".log",
  ".txt",
  ".out",
  ".err",
  ".stdout",
  ".stderr",
  ".trace",
  ".stack",
  ".json",
  ".jsonl",
  ".ndjson",
  ".csv",
  ".tsv",
  ".xml",
  ".yaml",
  ".yml",
  ".toml",
  ".ini",
  ".conf",
  ".cfg",
  ".properties",
  ".md",
  ".sql",
  ".html",
  ".htm",
  ".css",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".py",
  ".sh",
  ".bash",
  ".zsh",
  ".env",
]);

const BINARY_EXTENSIONS = new Set([
  ".7z",
  ".avi",
  ".bmp",
  ".class",
  ".doc",
  ".docx",
  ".dmg",
  ".exe",
  ".gif",
  ".gz",
  ".ico",
  ".jar",
  ".jpeg",
  ".jpg",
  ".m4a",
  ".mov",
  ".mp3",
  ".mp4",
  ".pdf",
  ".png",
  ".ppt",
  ".pptx",
  ".rar",
  ".sqlite",
  ".tar",
  ".tif",
  ".tiff",
  ".wasm",
  ".wav",
  ".webp",
  ".xls",
  ".xlsx",
  ".zip",
]);

const BINARY_MIME_TYPES = new Set([
  "application/pdf",
  "application/zip",
  "application/x-7z-compressed",
  "application/x-rar-compressed",
  "application/x-tar",
  "application/gzip",
  "application/vnd.rar",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/x-msdownload",
  "application/wasm",
]);

const extensionOf = (name: string) => {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot).toLowerCase();
};

export const LOG_FILE_ACCEPT = [
  "text/*",
  ...TEXT_EXTENSIONS,
].join(",");

export async function isSupportedLogFile(file: File): Promise<boolean> {
  const extension = extensionOf(file.name);
  const mime = file.type.toLowerCase().split(";")[0].trim();

  // HAR captures have their own inspector and should not open as ordinary logs.
  if (extension === ".har" || mime === "application/har+json") return false;
  if (BINARY_EXTENSIONS.has(extension)) return false;
  if (
    mime.startsWith("image/") ||
    mime.startsWith("audio/") ||
    mime.startsWith("video/") ||
    BINARY_MIME_TYPES.has(mime)
  ) {
    return false;
  }
  if (file.size === 0) return true;

  try {
    const sample = new Uint8Array(
      await file.slice(0, Math.min(file.size, 8192)).arrayBuffer(),
    );
    // Text files may contain tabs, line breaks, and ANSI escape sequences.
    // NUL bytes or a high ratio of other controls indicate binary data.
    if (sample.includes(0)) return false;
    let controls = 0;
    for (const byte of sample) {
      if (
        byte < 32 &&
        byte !== 9 &&
        byte !== 10 &&
        byte !== 12 &&
        byte !== 13 &&
        byte !== 27
      ) {
        controls++;
      }
    }
    if (controls / sample.length > 0.03) return false;
    return true;
  } catch {
    return false;
  }
}
