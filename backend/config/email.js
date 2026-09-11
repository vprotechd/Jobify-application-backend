import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const sendOTPEmail = async ({
  email,
  name,
  otp,
  type,
}) => {
  let subject = "";
  let title = "";
  let message = "";

  if (type === "registration") {
    subject = "Verify your Jobify account";
    title = "Verify your Jobify account";
    message =
      "Use the OTP below to verify your email address and activate your Jobify account.";
  }

  if (type === "reset") {
    subject = "Reset your Jobify password";
    title = "Password Reset Request";
    message =
      "We received a request to reset your Jobify password. Use the OTP below to continue.";
  }

  await transporter.sendMail({
    from: `"Jobify" <${process.env.EMAIL_USER}>`,
    to: email,
    subject,

    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>${subject}</title>
      </head>

      <body style="
        margin:0;
        padding:0;
        background:#f8fafc;
        font-family:Arial, sans-serif;
      ">

        <div style="
          max-width:600px;
          margin:40px auto;
          background:white;
          border:1px solid #e2e8f0;
          border-radius:12px;
          overflow:hidden;
        ">

          <div style="
            background:#2563eb;
            padding:25px;
            text-align:center;
          ">
            <h1 style="
              margin:0;
              color:white;
              font-size:26px;
            ">
              Jobify
            </h1>
          </div>

          <div style="padding:35px">

            <h2 style="
              margin-top:0;
              color:#0f172a;
            ">
              ${title}
            </h2>

            <p style="color:#475569">
              Hello ${name},
            </p>

            <p style="
              color:#475569;
              line-height:1.7;
            ">
              ${message}
            </p>

            <div style="
              margin:30px 0;
              padding:25px;
              background:#eff6ff;
              border-radius:10px;
              text-align:center;
            ">

              <p style="
                margin:0 0 10px;
                color:#64748b;
                font-size:13px;
              ">
                Your verification code
              </p>

              <strong style="
                font-size:34px;
                color:#2563eb;
                letter-spacing:8px;
              ">
                ${otp}
              </strong>

            </div>

            <p style="
              color:#64748b;
              font-size:14px;
            ">
              This OTP is valid for 10 minutes.
            </p>

            <p style="
              color:#64748b;
              font-size:14px;
            ">
              If you did not request this, you can safely ignore this email.
            </p>

          </div>

          <div style="
            padding:20px;
            border-top:1px solid #e2e8f0;
            text-align:center;
          ">
            <p style="
              margin:0;
              color:#94a3b8;
              font-size:12px;
            ">
              © ${new Date().getFullYear()} Jobify
            </p>
          </div>

        </div>

      </body>
      </html>
    `,
  });
};