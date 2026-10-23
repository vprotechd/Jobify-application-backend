
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Check Cloudinary configuration and initialize the SDK.
function ensureConfigured() {
  const cloudName = String(
    process.env.CLOUDINARY_CLOUD_NAME || ""
  ).trim();

  const apiKey = String(
    process.env.CLOUDINARY_API_KEY || ""
  ).trim();

  const apiSecret = String(
    process.env.CLOUDINARY_API_SECRET || ""
  ).trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to your server environment."
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

// Check whether the required environment variables are available.
export const isCloudinaryConfigured = () => {
  return Boolean(
    String(process.env.CLOUDINARY_CLOUD_NAME || "").trim() &&
      String(process.env.CLOUDINARY_API_KEY || "").trim() &&
      String(process.env.CLOUDINARY_API_SECRET || "").trim()
  );
};

// Upload a local file to Cloudinary.
export async function uploadFileToCloudinary(
  file,
  {
    folder,
    resourceType = "auto",
    type = "upload",
    removeLocalFile = true,
    publicId,
  } = {}
) {
  try {
    ensureConfigured();

    if (!file?.path) {
      throw new Error("Upload file is missing.");
    }

    const uploadOptions = {
      ...(publicId
        ? { public_id: publicId }
        : { folder: folder || "jobify" }),

      resource_type: resourceType,
      type,
      use_filename: false,
      unique_filename: !publicId,
      overwrite: false,
    };

    const result = await cloudinary.uploader.upload(
      file.path,
      uploadOptions
    );

    if (!result?.secure_url || !result?.public_id) {
      throw new Error(
        "Cloudinary upload did not return the expected image URL and public ID."
      );
    }

    return result;
  } catch (error) {
    // Cloudinary may return an Error or a plain object.
    const details =
      error?.error ||
      error?.response?.data?.error ||
      error?.response?.data ||
      {};

    const message =
      error?.message ||
      details?.message ||
      "Cloudinary upload failed.";

    const statusCode =
      error?.http_code ||
      details?.http_code ||
      error?.response?.status;

    // Do not log API secrets or credentials.
    console.error("Cloudinary upload failed:", {
      message,
      http_code: statusCode || null,
      name: error?.name || "CloudinaryError",
      resourceType,
      folder: folder || "jobify",
    });

    const wrappedError = new Error(message);
    wrappedError.name = "CloudinaryUploadError";

    if (statusCode) {
      wrappedError.http_code = statusCode;
    }

    throw wrappedError;
  } finally {
    // Clean up the temporary upload file on both success and failure.
    if (removeLocalFile && file?.path) {
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (cleanupError) {
        console.error(
          "Temporary upload file cleanup failed:",
          cleanupError.message
        );
      }
    }
  }
}

// Delete an existing Cloudinary asset.
export async function deleteCloudinaryAsset(
  publicId,
  resourceType = "image",
  type = "upload"
) {
  if (!publicId || !isCloudinaryConfigured()) {
    return;
  }

  try {
    ensureConfigured();

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      type,
      invalidate: true,
    });

    if (result?.result === "error") {
      console.error("Cloudinary asset deletion failed:", {
        publicId,
        resourceType,
        result: result.result,
      });
    }

    return result;
  } catch (error) {
    console.error("Cloudinary delete error:", {
      message: error?.message || "Unable to delete Cloudinary asset.",
      http_code:
        error?.http_code ||
        error?.error?.http_code ||
        error?.response?.status ||
        null,
      publicId,
      resourceType,
    });

    // Keep deletion failures from crashing the profile update.
    return null;
  }
}

// Generate a signed Cloudinary URL.
export function signedCloudinaryUrl(
  publicId,
  {
    resourceType = "raw",
    type = "upload",
    download = false,
  } = {}
) {
  if (!publicId || !isCloudinaryConfigured()) {
    return "";
  }

  ensureConfigured();

  return cloudinary.url(publicId, {
    resource_type: resourceType,
    type,
    secure: true,
    sign_url: true,
    ...(download ? { flags: "attachment" } : {}),
  });
}

// Keep this export for existing files that import the Cloudinary SDK.
export { cloudinary };
