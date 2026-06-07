import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { runDatabaseSetup } from "@/lib/db-setup.server";
import { buildStoragePath, getImageContentType } from "@/lib/image-upload";
import { ensureEventImagesBucket, EVENT_IMAGES_BUCKET } from "@/lib/storage-bucket.server";

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
    await ensureEventImagesBucket();

    const result = await runDatabaseSetup();
    if (!result.ok && result.reason !== "missing_db_url") {
      throw new Error("הקמת מסד הנתונים נכשלה");
    }

    return { ok: true as const, dbSetup: result.ok };
  });

export const ensureStorageBucket = createServerFn({ method: "POST" })
  .inputValidator(z.object({ adminName: z.string().min(1) }))
  .handler(async ({ data }) => {
    assertAdmin(data.adminName);
    await ensureEventImagesBucket();
    return { ok: true as const, bucket: EVENT_IMAGES_BUCKET };
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
    await ensureEventImagesBucket();

    const path = buildStoragePath({
      name: data.fileName || "upload.jpg",
      type: data.contentType,
    } as File);

    const buffer = Buffer.from(data.base64, "base64");
    const contentType = data.contentType || getImageContentType({ type: data.contentType } as File);

    const { error } = await supabaseAdmin.storage.from(EVENT_IMAGES_BUCKET).upload(path, buffer, {
      contentType,
      upsert: false,
      cacheControl: "3600",
    });

    if (error) throw new Error(error.message);

    const { data: urlData } = supabaseAdmin.storage.from(EVENT_IMAGES_BUCKET).getPublicUrl(path);
    return { publicUrl: urlData.publicUrl };
  });
