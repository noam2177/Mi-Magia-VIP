import { uploadEventImage } from "@/lib/api/admin.functions";
import { getAdminSession } from "@/lib/admin-session";
import { db } from "@/lib/db";
import {
  buildStoragePath,
  fileToBase64,
  getImageContentType,
  isAcceptedImageFile,
} from "@/lib/image-upload";

export async function uploadEventImageFile(file: File): Promise<string> {
  if (!isAcceptedImageFile(file)) {
    throw new Error("סוג קובץ לא נתמך. ניתן להעלות JPG, PNG, WEBP, GIF, SVG, AVIF, HEIC, BMP או TIFF.");
  }

  const contentType = getImageContentType(file);
  const path = buildStoragePath(file);
  const session = getAdminSession();

  if (session?.name) {
    try {
      const base64 = await fileToBase64(file);
      const result = await uploadEventImage({
        data: {
          adminName: session.name,
          contentType,
          base64,
          fileName: file.name,
        },
      });
      if (result?.publicUrl) return result.publicUrl;
    } catch (err) {
      console.warn("[upload] server upload failed, falling back to client", err);
    }
  }

  const { error } = await db.storage.from("event-images").upload(path, file, {
    upsert: false,
    contentType,
    cacheControl: "3600",
  });
  if (error) throw new Error(error.message);

  const { data } = db.storage.from("event-images").getPublicUrl(path);
  return data.publicUrl as string;
}
