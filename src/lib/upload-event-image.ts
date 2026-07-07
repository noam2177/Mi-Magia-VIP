import { db } from "@/lib/db";
import {
  buildStoragePath,
  getImageContentType,
  isAcceptedImageFile,
} from "@/lib/image-upload";

const BUCKET = "event-images";

export async function uploadEventImageFile(file: File): Promise<string> {
  if (!isAcceptedImageFile(file)) {
    throw new Error(
      "סוג קובץ לא נתמך. ניתן להעלות JPG, PNG, WEBP, GIF, SVG, AVIF, HEIC, BMP או TIFF.",
    );
  }

  const path = buildStoragePath(file);
  const contentType = getImageContentType(file);

  const { error } = await db.storage.from(BUCKET).upload(path, file, {
    contentType,
    upsert: false,
    cacheControl: "3600",
  });
  if (error) throw new Error(error.message);

  const { data: signed, error: signError } = await db.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (signError) throw new Error(signError.message);
  return signed.signedUrl;
}
