import "dotenv/config";
import nodemailer from "nodemailer";

const user = String(process.env.EMAIL_USER || "").trim();
const pass = String(process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD || "").trim();
const to = String(process.env.EMAIL_TEST_TO || user).trim();
if (!user || !pass) { console.error("FAIL: Set EMAIL_USER and EMAIL_PASS (Gmail App Password) in .env"); process.exit(1); }
const transporter = nodemailer.createTransport({ service:"gmail", auth:{user,pass} });
try {
  await transporter.verify();
  console.log("PASS: Gmail SMTP authentication succeeded.");
  if (process.env.SEND_TEST_EMAIL === "true") {
    await transporter.sendMail({from:`"Jobify" <${user}>`,to,subject:"Jobify SMTP test",text:"Jobify email configuration is working."});
    console.log(`PASS: Test email sent to ${to}.`);
  } else console.log("PASS: SMTP verified. Set SEND_TEST_EMAIL=true to send a test message.");
} catch (error) {
  console.error("FAIL: Gmail SMTP authentication failed.");
  console.error(error.message);
  process.exit(1);
}
