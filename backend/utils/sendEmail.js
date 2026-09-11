import axios from "axios";
import nodemailer from "nodemailer";

/**
 * Sends transactional email.
 *
 * Production on Render:
 * - Set RESEND_API_KEY and EMAIL_FROM in Render Environment Variables.
 * - Resend uses HTTPS, so it works on Render Free where outbound SMTP
 *   ports (25/465/587) are restricted.
 *
 * Local development:
 * - If RESEND_API_KEY is not set, the existing Gmail/Nodemailer
 *   configuration is used.
 */
const sendEmail = async ({ to, subject, text, html }) => {
  const resendApiKey = String(process.env.RESEND_API_KEY || "").trim();

  // =====================================================
  // RESEND (recommended for Render / production)
  // =====================================================
  if (resendApiKey) {
    const from =
      String(process.env.EMAIL_FROM || "").trim() ||
      "Jobify <onboarding@resend.dev>";

    try {
      const response = await axios.post(
        "https://api.resend.com/emails",
        {
          from,
          to: [to],
          subject,
          ...(text ? { text } : {}),
          ...(html ? { html } : {}),
        },
        {
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        }
      );

      console.log("Email sent successfully via Resend:", response.data?.id || "ok");
      return response.data;
    } catch (error) {
      const status = error.response?.status;
      const providerMessage =
        error.response?.data?.message ||
        error.response?.data?.error?.message ||
        error.message;

      console.error(
        "Resend email error:",
        status ? `${status} - ${providerMessage}` : providerMessage
      );

      const err = new Error(
        "Email service unavailable. Check RESEND_API_KEY and EMAIL_FROM."
      );
      err.statusCode = 503;
      err.cause = error;
      throw err;
    }
  }

  // =====================================================
  // GMAIL / NODEMAILER FALLBACK (local development)
  // =====================================================
  const user = String(process.env.EMAIL_USER || "").trim();
  const pass = String(
    process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD || ""
  ).trim();

  if (!user || !pass) {
    const err = new Error(
      "Email service is not configured. Set RESEND_API_KEY and EMAIL_FROM for production, or EMAIL_USER and EMAIL_PASS for local development."
    );
    err.statusCode = 503;
    throw err;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `"Jobify" <${user}>`,
      to,
      subject,
      text,
      html,
    });
  } catch (error) {
    console.error("Gmail email sending error:", error.message);

    const err = new Error(
      "Email service unavailable. Check Gmail credentials or use Resend for production."
    );
    err.statusCode = 503;
    err.cause = error;
    throw err;
  }
};

export default sendEmail;
