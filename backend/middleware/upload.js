import fs from "fs";
import path from "path";
import crypto from "crypto";

const uploadDir = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_REQUEST_SIZE = 12 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const RESUME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const safeFilename = (original) => {
  const ext = path.extname(original || "").toLowerCase();
  const base = path.basename(original || "file", ext).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80) || "file";
  return `${base}-${Date.now()}-${crypto.randomBytes(5).toString("hex")}${ext}`;
};

const parseDisposition = (value) => {
  const name = value.match(/name="([^"]+)"/i)?.[1] || "";
  const filename = value.match(/filename="([^"]*)"/i)?.[1] || "";
  return { name, filename };
};

const upload = {
  fields: (fieldDefinitions = []) => {
    const allowedFields = new Map(fieldDefinitions.map((f) => [f.name, f.maxCount || 1]));
    return async (req, res, next) => {
      try {
        const contentType = req.headers["content-type"] || "";
        if (!contentType.toLowerCase().startsWith("multipart/form-data")) return next();

        const boundary = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)?.[1] || contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)?.[2];
        if (!boundary) return res.status(400).json({ success: false, message: "Invalid multipart request." });

        const chunks = [];
        let total = 0;
        for await (const chunk of req) {
          total += chunk.length;
          if (total > MAX_REQUEST_SIZE) return res.status(413).json({ success: false, message: "Upload request is too large." });
          chunks.push(chunk);
        }
        const body = Buffer.concat(chunks);
        const marker = Buffer.from(`--${boundary}`);
        const parts = [];
        let start = 0;
        while (true) {
          const found = body.indexOf(marker, start);
          if (found < 0) break;
          if (found > start) parts.push(body.subarray(start, found));
          start = found + marker.length;
        }

        req.body = {};
        req.files = {};

        for (let part of parts) {
          part = part.subarray(part[0] === 13 && part[1] === 10 ? 2 : 0);
          if (!part.length || part.equals(Buffer.from("--\r\n"))) continue;
          if (part.subarray(-2).equals(Buffer.from("--"))) part = part.subarray(0, -2);
          if (part.subarray(-2).equals(Buffer.from("\r\n"))) part = part.subarray(0, -2);

          const separator = Buffer.from("\r\n\r\n");
          const headerEnd = part.indexOf(separator);
          if (headerEnd < 0) continue;
          const headers = part.subarray(0, headerEnd).toString("utf8");
          const content = part.subarray(headerEnd + separator.length);
          const disposition = headers.match(/content-disposition:\s*([^\r\n]+)/i)?.[1] || "";
          const { name, filename } = parseDisposition(disposition);

          // Text fields are part of the multipart form too. The previous
          // implementation incorrectly discarded every non-file field
          // because only profileImage/resume were in allowedFields.
          // Accept normal text fields and restrict only uploaded files.
          if (!name) continue;
          if (filename && !allowedFields.has(name)) continue;

          const type = headers.match(/content-type:\s*([^\r\n]+)/i)?.[1]?.trim().toLowerCase() || "";
          if (filename) {
            if (content.length > MAX_FILE_SIZE) return res.status(413).json({ success: false, message: `${name} must be smaller than 5 MB.` });
            if (name === "profileImage" && !IMAGE_TYPES.has(type)) return res.status(400).json({ success: false, message: "Profile picture must be JPG, JPEG, PNG or WEBP." });
            if (name === "resume" && !RESUME_TYPES.has(type)) return res.status(400).json({ success: false, message: "Resume must be PDF, DOC or DOCX." });
            const stored = safeFilename(filename);
            const destination = path.join(uploadDir, stored);
            fs.writeFileSync(destination, content);
            const current = req.files[name] || [];
            if (current.length >= allowedFields.get(name)) { fs.unlinkSync(destination); continue; }
            current.push({ fieldname: name, originalname: filename, encoding: "7bit", mimetype: type, destination: uploadDir, filename: stored, path: destination, size: content.length });
            req.files[name] = current;
          } else {
            req.body[name] = content.toString("utf8");
          }
        }
        next();
      } catch (error) {
        next(error);
      }
    };
  },
};

export default upload;
