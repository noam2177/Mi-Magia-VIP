import { uploadEventImage } from "@/lib/api/admin.functions";
import { getAdminSession } from "@/lib/admin-session";
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

  const session = getAdminSession();
  if (!session?.name) {
    throw new Error("יש להתחבר לפאנל ניהול לפני העלאת תמונות");
  }

  const contentType = getImageContentType(file);
  const base64 = await fileToBase64(file);

  try {
    const result = await uploadEventImage({
      data: {
        adminName: session.name,
        contentType,
        base64,
        fileName: file.name || buildStoragePath(file),
      },
    });
    if (result?.publicUrl) return result.publicUrl;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "העלאה נכשלה";
    if (/service.role|service_role|secret/i.test(msg)) {
      throw new Error(
        "חסר SUPABASE_SERVICE_ROLE_KEY בשרת — הרץ את supabase/setup-all.sql ב-Supabase SQL Editor",
      );
    }
    throw new Error(msg);
  }

  throw new Error("העלאה נכשלה");
}
