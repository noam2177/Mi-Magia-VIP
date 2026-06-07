const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/bmp": "bmp",
  "image/tiff": "tiff",
};

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
  bmp: "image/bmp",
  tiff: "image/tiff",
  tif: "image/tiff",
};

export const ACCEPTED_IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/avif,image/heic,image/heif,image/bmp,image/tiff,.jpg,.jpeg,.png,.webp,.gif,.svg,.avif,.heic,.heif,.bmp,.tif,.tiff";

export function getImageExtension(file: File): string {
  const fromMime = MIME_TO_EXT[file.type.toLowerCase()];
  if (fromMime) return fromMime;

  const match = file.name.match(/\.([a-z0-9]+)$/i);
  if (match) {
    const ext = match[1].toLowerCase();
    if (EXT_TO_MIME[ext]) return ext;
  }

  return "jpg";
}

export function getImageContentType(file: File): string {
  if (file.type) return file.type;
  const ext = getImageExtension(file);
  return EXT_TO_MIME[ext] || "image/jpeg";
}

export function isAcceptedImageFile(file: File): boolean {
  const ext = getImageExtension(file);
  return ext in EXT_TO_MIME;
}

/** ASCII-only storage path — Supabase rejects Hebrew / special chars in object keys. */
export function buildStoragePath(file: File): string {
  const ext = getImageExtension(file);
  return `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
}

export async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
