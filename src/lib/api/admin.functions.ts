import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { runDatabaseSetup } from "@/lib/db-setup.server";
import { buildStoragePath, getImageContentType } from "@/lib/image-upload";

const ALLOWED_ADMIN_NAMES = ["נעם", "דני", "תומר"];

function assertAdmin(name: string) {
  if (!ALLOWED_ADMIN_NAMES.includes(name.trim())) {
    throw new Error("אין הרשאה");
  }
}

export const bootstrapDatabase = createServerFn({ method: "POST" })
  .inputValidator(z.object({ adminName: z.string().min(1) }))
  .handler(async ({ data }) => {
    assertAdmin(data.adminName);
    const result = await runDatabaseSetup();
    if (!result.ok) {
      throw new Error(
        result.reason === "missing_db_url"
          ? "חסר DATABASE_URL בשרת — הרץ את supabase/setup-all.sql ב-Supabase SQL Editor"
          : "הקמת מסד הנתונים נכשלה",
      );
    }
    return { ok: true as const };
  });

export const uploadEventImage = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      adminName: z.string().min(1),
      contentType: z.string().min(1),
      base64: z.string().min(1),
      fileName: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.adminName);

    const path = buildStoragePath({
      name: data.fileName || "upload.jpg",
      type: data.contentType,
    } as File);

    const buffer = Buffer.from(data.base64, "base64");
    const contentType = data.contentType || getImageContentType({ type: data.contentType } as File);

    const { error } = await supabaseAdmin.storage.from("event-images").upload(path, buffer, {
      contentType,
      upsert: false,
      cacheControl: "3600",
    });

    if (error) throw new Error(error.message);

    const { data: urlData } = supabaseAdmin.storage.from("event-images").getPublicUrl(path);
    return { publicUrl: urlData.publicUrl };
  });
