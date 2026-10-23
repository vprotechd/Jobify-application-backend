// Run from the backend folder:  node scripts/testCloudinary.js
import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";

const cloud_name = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
const api_key = String(process.env.CLOUDINARY_API_KEY || "").trim();
const api_secret = String(process.env.CLOUDINARY_API_SECRET || "").trim();

console.log("cloud_name :", JSON.stringify(cloud_name));
console.log("api_key    :", api_key ? `${api_key.slice(0, 4)}...(${api_key.length} chars)` : "MISSING");
console.log("api_secret :", api_secret ? `set (${api_secret.length} chars)` : "MISSING");

cloudinary.config({ cloud_name, api_key, api_secret, secure: true });

const png =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

try {
  const ping = await cloudinary.api.ping();
  console.log("1) Admin API ping :", ping);
} catch (e) {
  console.log("1) Admin API ping FAILED:", e?.error?.message || e?.message, "| http_code:", e?.error?.http_code || e?.http_code);
}

for (const resource_type of ["image", "raw"]) {
  try {
    const target = resource_type === "image" ? png : "data:text/plain;base64,aGVsbG8=";
    const r = await cloudinary.uploader.upload(target, { folder: "jobify/_test", resource_type });
    console.log(`2) Upload (${resource_type}) OK:`, r.secure_url);
    await cloudinary.uploader.destroy(r.public_id, { resource_type });
  } catch (e) {
    console.log(`2) Upload (${resource_type}) FAILED:`, e?.error?.message || e?.message, "| http_code:", e?.error?.http_code || e?.http_code);
  }
}