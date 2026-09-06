import { supabase } from "@/integrations/supabase/client";

const BUCKET = "product-images";
/** Ten years, in seconds — signed links effectively never expire for the shop. */
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10;

/** Uploads a product photo and returns a long-lived link that can be shown anywhere. */
export async function uploadProductImage(file: File): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("You need to be signed in to upload a photo.");
  if (!file.type.startsWith("image/")) throw new Error("Please pick an image file.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Image must be smaller than 10 MB.");

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;

  const { data, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (signError || !data?.signedUrl) throw signError ?? new Error("Could not create image link.");

  return data.signedUrl;
}
