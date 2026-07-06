import { uploadEventImage } from "@/lib/api/admin.functions";
import {
  buildStoragePath,
  fileToBase64,
  getImageContentType,
  isAcceptedImageFile,
} from "@/lib/image-upload";

export async function uploadEventImageFile(file: File): Promise<string> {
  if (!isAcceptedImageFile(file)) {
    throw new Error(
      "סוג קובץ לא נתמך. ניתן להעלות JPG, PNG, WEBP, GIF, SVG, AVIF, HEIC, BMP או TIFF.",
    );
  }

  const contentType = getImageContentType(file);
  const base64 = await fileToBase64(file);

  const result = await uploadEventImage({
    data: {
      contentType,
      base64,
      fileName: file.name || buildStoragePath(file),
    },
  });
  if (result?.publicUrl) return result.publicUrl;
  throw new Error("העלאה נכשלה");
}
