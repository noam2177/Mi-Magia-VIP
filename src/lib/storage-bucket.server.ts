import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const EVENT_IMAGES_BUCKET = "event-images";

export const EVENT_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
  "image/heic",
  "image/heif",
  "image/bmp",
  "image/tiff",
];

function isBucketMissing(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("bucket not found") || m.includes("not found");
}

/** יוצר את bucket התמונות אם חסר (דורש service role בשרת). */
export async function ensureEventImagesBucket(): Promise<void> {
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
  if (listError) throw new Error(listError.message);

  const exists = buckets?.some((b) => b.id === EVENT_IMAGES_BUCKET || b.name === EVENT_IMAGES_BUCKET);
  if (exists) return;

  const { error: createError } = await supabaseAdmin.storage.createBucket(EVENT_IMAGES_BUCKET, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: EVENT_IMAGE_MIME_TYPES,
  });

  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(createError.message);
  }
}

export function isStorageBucketError(error: { message?: string } | null): boolean {
  if (!error?.message) return false;
  return isBucketMissing(error.message);
}
