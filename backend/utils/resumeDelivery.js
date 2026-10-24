import axios from "axios";
import { cloudinary, isCloudinaryConfigured } from "./cloudinary.js";

/*
 * Delivers a resume stored on Cloudinary to the client.
 *
 * Cloudinary frequently refuses direct delivery of PDF / raw files
 * (HTTP 401/403 "untrusted customer"). Axios errors expose that upstream
 * status as `error.status`, and the controllers used to forward it to the
 * app - so a recruiter saw "401 Unauthorized" even though their own login
 * was perfectly valid.
 *
 * This helper tries, in order:
 *   1. the stored URL,
 *   2. a signed delivery URL,
 *   3. an authenticated Cloudinary API download URL (bypasses delivery
 *      restrictions on the account),
 * and, if all of them fail, throws an error with status 502 (never a
 * misleading 401/403).
 */

// "https://res.cloudinary.com/<cloud>/raw/upload/v123/jobify/resumes/a-1.pdf"
//   -> "jobify/resumes/a-1.pdf"
export const publicIdFromCloudinaryUrl = (url) => {
  try {
    const pathname = decodeURIComponent(new URL(url).pathname);
    const match = pathname.match(/\/(?:raw|image|video)\/(?:upload|authenticated|private)\/(?:s--[^/]+--\/)?(?:v\d+\/)?(.+)$/);
    return match?.[1] || "";
  } catch {
    return "";
  }
};

const tryFetch = async (url) => {
  try {
    return await axios.get(url, { responseType: "stream", timeout: 30000 });
  } catch (error) {
    // Drain the failed stream so the socket is released.
    try { error.response?.data?.destroy?.(); } catch { /* ignore */ }
    return null;
  }
};

export async function fetchCloudinaryResume(storedUrl, storedPublicId = "") {
  const publicId = storedPublicId || publicIdFromCloudinaryUrl(storedUrl);

  let remote = await tryFetch(storedUrl);
  if (remote) return remote;

  if (publicId && isCloudinaryConfigured()) {
    try {
      const signed = cloudinary.url(publicId, {
        resource_type: "raw",
        type: "upload",
        secure: true,
        sign_url: true,
      });
      remote = await tryFetch(signed);
      if (remote) return remote;
    } catch (error) {
      console.error("Signed resume URL failed:", error.message);
    }

    try {
      const apiUrl = cloudinary.utils.private_download_url(publicId, "", {
        resource_type: "raw",
        type: "upload",
        attachment: true,
        expires_at: Math.floor(Date.now() / 1000) + 300,
      });
      remote = await tryFetch(apiUrl);
      if (remote) return remote;
    } catch (error) {
      console.error("Private resume download URL failed:", error.message);
    }
  }

  const error = new Error(
    "The resume could not be retrieved from file storage. Please ask the candidate to re-upload it, or try again shortly."
  );
  error.status = 502;
  throw error;
}
