export const MAX_FILE_SIZE_BYTES = 12 * 1024 * 1024;
export const FILE_SIZE_LIMIT_HINT = "Maximum file size: 12 MB.";
export const FILE_SIZE_LIMIT_ERROR =
  "File exceeds the 12 MB limit. Choose a smaller file.";

export function isFileTooLarge(file: Pick<File, "size">): boolean {
  return file.size > MAX_FILE_SIZE_BYTES;
}

export function assertFileSize(file: Pick<File, "size">): void {
  if (isFileTooLarge(file)) throw new Error(FILE_SIZE_LIMIT_ERROR);
}
