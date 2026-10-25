
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

/*
|--------------------------------------------------------------------------
| CLOUDINARY CONFIGURATION
|--------------------------------------------------------------------------
*/

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
      "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to the server environment."
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

/*
|--------------------------------------------------------------------------
| CHECK CONFIGURATION
|--------------------------------------------------------------------------
*/

export const isCloudinaryConfigured = () => {
  return Boolean(
    String(process.env.CLOUDINARY_CLOUD_NAME || "").trim() &&
      String(process.env.CLOUDINARY_API_KEY || "").trim() &&
      String(process.env.CLOUDINARY_API_SECRET || "").trim()
  );
};

/*
|--------------------------------------------------------------------------
| UPLOAD FILE
|--------------------------------------------------------------------------
|
| Used for:
| - Profile images
| - Resumes
|
| Resume:
|   resource_type = raw
|   type = upload
|
*/

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
        ? {
            public_id: publicId,
          }
        : {
            folder: folder || "jobify",
          }),

      resource_type: resourceType,
      type,

      use_filename: false,
      unique_filename: !publicId,
      overwrite: false,

      // Important for raw files such as PDF/DOC/DOCX.
      use_asset_folder: false,
    };

    const result = await cloudinary.uploader.upload(
      file.path,
      uploadOptions
    );

    if (!result?.secure_url || !result?.public_id) {
      throw new Error(
        "Cloudinary upload did not return the expected secure URL and public ID."
      );
    }

    return result;
  } catch (error) {
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

    console.error("Cloudinary upload failed:", {
      message,
      http_code: statusCode || null,
      name: error?.name || "CloudinaryError",
      resourceType,
      type,
      folder: folder || null,
      publicId: publicId || null,
    });

    const wrappedError = new Error(message);

    wrappedError.name = "CloudinaryUploadError";

    if (statusCode) {
      wrappedError.http_code = statusCode;
    }

    throw wrappedError;
  } finally {
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

/*
|--------------------------------------------------------------------------
| DELETE CLOUDINARY ASSET
|--------------------------------------------------------------------------
*/

export async function deleteCloudinaryAsset(
  publicId,
  resourceType = "image",
  type = "upload"
) {
  if (!publicId || !isCloudinaryConfigured()) {
    return null;
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
        type,
        result: result.result,
      });
    }

    return result;
  } catch (error) {
    console.error("Cloudinary delete error:", {
      message:
        error?.message || "Unable to delete Cloudinary asset.",
      http_code:
        error?.http_code ||
        error?.error?.http_code ||
        error?.response?.status ||
        null,
      publicId,
      resourceType,
      type,
    });

    // Do not crash profile updates because cleanup failed.
    return null;
  }
}

/*
|--------------------------------------------------------------------------
| GET CLOUDINARY RESOURCE DETAILS
|--------------------------------------------------------------------------
|
| This is useful for raw resumes.
|
*/

export async function getCloudinaryResource(
  publicId,
  {
    resourceType = "raw",
    type = "upload",
  } = {}
) {
  if (!publicId) {
    throw new Error("Cloudinary public ID is required.");
  }

  ensureConfigured();

  return cloudinary.api.resource(publicId, {
    resource_type: resourceType,
    type,
  });
}

/*
|--------------------------------------------------------------------------
| GENERATE SIGNED CLOUDINARY URL
|--------------------------------------------------------------------------
|
| Use this when the Cloudinary resource is protected.
|
| IMPORTANT:
| The API secret stays on the backend.
| Never generate this URL in React Native using the secret.
|
*/

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

  const options = {
    resource_type: resourceType,
    type,
    secure: true,
    sign_url: true,
  };

  if (download) {
    options.flags = "attachment";
  }

  return cloudinary.url(publicId, options);
}

/*
|--------------------------------------------------------------------------
| GENERATE AUTHENTICATED RAW RESOURCE URL
|--------------------------------------------------------------------------
|
| This is kept separate from signedCloudinaryUrl so the caller can
| explicitly choose the correct delivery type.
|
*/

export function getRawResumeUrl(publicId, download = false) {
  if (!publicId || !isCloudinaryConfigured()) {
    return "";
  }

  ensureConfigured();

  return cloudinary.url(publicId, {
    resource_type: "raw",
    type: "upload",
    secure: true,
    sign_url: true,
    ...(download ? { flags: "attachment" } : {}),
  });
}

/*
|--------------------------------------------------------------------------
| EXTRACT CLOUDINARY PUBLIC ID FROM URL
|--------------------------------------------------------------------------
|
| Useful for old database records where only resume URL exists.
|
*/

export function publicIdFromCloudinaryUrl(
  url,
  resourceType = "raw"
) {
  if (!url || typeof url !== "string") {
    return "";
  }

  try {
    const parsed = new URL(url);

    const pathname = parsed.pathname.replace(/^\/+/, "");

    const marker =
      resourceType === "raw"
        ? "/raw/"
        : "/image/";

    const markerIndex = pathname.indexOf(marker);

    if (markerIndex === -1) {
      return "";
    }

    const afterResource = pathname.substring(
      markerIndex + marker.length
    );

    const uploadIndex = afterResource.indexOf("upload/");

    if (uploadIndex === -1) {
      return "";
    }

    let publicPath = afterResource.substring(
      uploadIndex + "upload/".length
    );

    // Remove transformation/version portion where applicable.
    publicPath = publicPath.replace(
      /^v\d+\//,
      ""
    );

    return decodeURIComponent(publicPath);
  } catch {
    return "";
  }
}

/*
|--------------------------------------------------------------------------
| KEEP EXISTING EXPORT
|--------------------------------------------------------------------------
*/

export { cloudinary };