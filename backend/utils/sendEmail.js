import nodemailer from "nodemailer";

const sendEmail = async ({ to, subject, text, html }) => {
  const user = String(process.env.EMAIL_USER || "").trim();
  const pass = String(process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD || "").trim();
  if (!user || !pass) {
    const err = new Error("Email service is not configured. Set EMAIL_USER and EMAIL_PASS (Gmail App Password).");
    err.statusCode = 503; throw err;
  }
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
    await transporter.sendMail({ from: `"Jobify" <${user}>`, to, subject, text, html });
  } catch (error) {
    console.error("Email sending error:", error.message);
    const err = new Error("Email service unavailable. Check EMAIL_USER and use a valid Gmail App Password.");
    err.statusCode = 503; err.cause = error; throw err;
  }
};
export default sendEmail;
