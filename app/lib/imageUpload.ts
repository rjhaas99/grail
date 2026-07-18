export const cardImageStorageBucket = "card-images";

export function sanitizeImageFileName(fileName: string) {
  const safeName = fileName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/^\.+/, "");

  return safeName || "image";
}

export function isSupportedImageFile(file: File) {
  return file.type.startsWith("image/");
}
