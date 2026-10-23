import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

function ensureConfigured() {
  const configured = Boolean(
    String(process.env.CLOUDINARY_CLOUD_NAME || "").trim() &&
    String(process.env.CLOUDINARY_API_KEY || "").trim() &&
    String(process.env.CLOUDINARY_API_SECRET || "").trim()
  );
  if (!configured) throw new Error("Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.");
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export const isCloudinaryConfigured = () => Boolean(
  String(process.env.CLOUDINARY_CLOUD_NAME || "").trim() &&
  String(process.env.CLOUDINARY_API_KEY || "").trim() &&
  String(process.env.CLOUDINARY_API_SECRET || "").trim()
);

export async function uploadFileToCloudinary(file, {
  folder,
  resourceType = "auto",
  type = "upload",
  removeLocalFile = true,
  publicId,
} = {}) {
  ensureConfigured();
  if (!file?.path) throw new Error("Upload file is missing.");
  // When an explicit publicId is given (it may already contain the folder path
  // and a file extension, which raw/PDF assets need) it is used as-is.
  const result = await cloudinary.uploader
    .upload(file.path, {
      ...(publicId ? { public_id: publicId } : { folder: folder || "jobify" }),
      resource_type: resourceType,
      type,
      use_filename: false,
      unique_filename: !publicId,
      overwrite: false,
    })
    .catch((error) => {
      // Cloudinary rejects with a plain object ({ message, http_code }); turn it
      // into a real Error so callers always get a readable message.
      const reason = error?.message || error?.error?.message || "Cloudinary upload failed.";
      const wrapped = new Error(reason);
      wrapped.http_code = error?.http_code || error?.error?.http_code;
      throw wrapped;
    });
  if (removeLocalFile) {
    try { fs.unlinkSync(file.path); } catch {}
  }
  return result;
}

export async function deleteCloudinaryAsset(publicId, resourceType = "image", type = "upload") {
  if (!isCloudinaryConfigured() || !publicId) return;
  try {
    ensureConfigured();
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, type, invalidate: true });
  } catch (error) {
    console.error("Cloudinary delete error:", error.response?.data || error.message);
  }
}

export function signedCloudinaryUrl(publicId, { resourceType = "raw", type = "upload", download = false } = {}) {
  if (!isCloudinaryConfigured() || !publicId) return "";
  ensureConfigured();
  return cloudinary.url(publicId, {
    resource_type: resourceType,
    type,
    secure: true,
    sign_url: true,
    flags: download ? "attachment" : undefined,
  });
}

export { cloudinary };
