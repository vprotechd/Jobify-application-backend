import axios from "axios";
import nodemailer from "nodemailer";

/**
 * Sends transactional email.
 *
 * Production:
 * - Prefer RESEND_API_KEY + EMAIL_FROM.
 * - If Resend is unavailable and Gmail credentials are configured,
 *   Gmail is used as a fallback so registration/OTP is not unnecessarily
 *   blocked by a temporary provider failure.
 *
 * Local development:
 * - Gmail/Nodemailer can be used directly with EMAIL_USER + EMAIL_PASS.
 */
const sendWithGmail = async ({ to, subject, text, html }) => {
  const user = String(process.env.EMAIL_USER || "").trim();
  const pass = String(
    process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD || ""
  ).trim();

  if (!user || !pass) {
    throw new Error(
      "Gmail email service is not configured. Set EMAIL_USER and EMAIL_PASS."
    );
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  await transporter.sendMail({
    from: `"Jobify" <${user}>`,
    to,
    subject,
    text,
    html,
  });

  console.log("Email sent successfully via Gmail");
};

const sendWithResend = async ({ to, subject, text, html }) => {
  const resendApiKey = String(process.env.RESEND_API_KEY || "").trim();

  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const from =
    String(process.env.EMAIL_FROM || "").trim() ||
    "Jobify <onboarding@resend.dev>";

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

  console.log(
    "Email sent successfully via Resend:",
    response.data?.id || "ok"
  );

  return response.data;
};

const sendEmail = async ({ to, subject, text, html }) => {
  const hasResend = Boolean(String(process.env.RESEND_API_KEY || "").trim());
  const hasGmail =
    Boolean(String(process.env.EMAIL_USER || "").trim()) &&
    Boolean(
      String(
        process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD || ""
      ).trim()
    );

  let resendError = null;

  if (hasResend) {
    try {
      return await sendWithResend({ to, subject, text, html });
    } catch (error) {
      resendError = error;

      const status = error.response?.status;
      const providerMessage =
        error.response?.data?.message ||
        error.response?.data?.error?.message ||
        error.message;

      console.error(
        "Resend email error:",
        status ? `${status} - ${providerMessage}` : providerMessage
      );
    }
  }

  // Gmail fallback is especially useful when a Resend sender/domain has
  // not been verified yet or Resend is temporarily unavailable.
  if (hasGmail) {
    try {
      await sendWithGmail({ to, subject, text, html });
      return { provider: "gmail" };
    } catch (error) {
      console.error("Gmail fallback email error:", error.message);

      const err = new Error(
        resendError
          ? "Email service is unavailable. Resend and Gmail both failed."
          : "Email service is unavailable. Check Gmail credentials."
      );
      err.statusCode = 503;
      err.cause = error;
      throw err;
    }
  }

  const err = new Error(
    "Email service is not configured. Set RESEND_API_KEY and EMAIL_FROM, or EMAIL_USER and EMAIL_PASS."
  );
  err.statusCode = 503;
  throw err;
};

export default sendEmail;
