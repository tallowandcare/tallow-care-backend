import nodemailer from 'nodemailer';

console.log("GMAIL_USER:", process.env.GMAIL_USER);
console.log(
  "GMAIL_APP_PASSWORD:",
  process.env.GMAIL_APP_PASSWORD ? "FOUND" : "MISSING"
);


// Create Gmail transporter using App Password
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
};

/**
 * Sends an OTP verification email
 * @param {string} toEmail - Recipient email address
 * @param {string} otp - 6-digit OTP to send
 * @param {string} userName - User's full name for personalization
 */
const sendOTPEmail = async (toEmail, otp, userName = 'there') => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"Tallow Care" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Your Tallow Care Verification Code',
    text: `Your Tallow Care verification code is: ${otp} This code expires in 5 minutes.`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Verify Your Email</title>
        </head>
        <body style="margin:0;padding:0;background:#fdf6ee;font-family:'DM Sans',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf6ee;padding:40px 0;">
            <tr>
              <td align="center">
                <table width="520" cellpadding="0" cellspacing="0" style="background:#fffaf4;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(42,35,24,.08);">
                  <!-- Header -->
                  <tr>
                    <td style="background:#2a2318;padding:32px 40px;text-align:center;">
                      <h1 style="margin:0;font-family:Georgia,serif;color:#fdf6ee;font-size:24px;font-weight:600;letter-spacing:-0.02em;">
                        Tallow <span style="color:#8aaa7a;">&amp;</span> Care
                      </h1>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style="padding:40px;">
                      <h2 style="margin:0 0 8px;color:#2a2318;font-size:22px;font-weight:600;">
                        Verify your email, ${userName} 👋
                      </h2>
                      <p style="margin:0 0 32px;color:#6b5c47;font-size:15px;line-height:1.6;">
                        Enter the code below to complete your Tallow Care account setup.
                        This code expires in <strong>5 minutes</strong>.
                      </p>

                      <!-- OTP Box -->
                      <div style="background:#fdf6ee;border:1.5px solid #e8ddd0;border-radius:12px;padding:28px;text-align:center;margin-bottom:32px;">
                        <p style="margin:0 0 8px;color:#a0917e;font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;">
                          Your verification code
                        </p>
                        <div style="font-size:40px;font-weight:700;color:#2a2318;letter-spacing:12px;font-family:monospace;">
                          ${otp}
                        </div>
                      </div>

                      <p style="margin:0 0 24px;color:#6b5c47;font-size:14px;line-height:1.6;">
                        If you didn't request this code, you can safely ignore this email.
                        Someone may have entered your email address by mistake.
                      </p>

                      <hr style="border:none;border-top:1px solid #e8ddd0;margin:24px 0;" />
                      <p style="margin:0;color:#a0917e;font-size:12px;text-align:center;">
                        © ${new Date().getFullYear()} Tallow Care. All rights reserved.<br/>
                        Pure ingredients. Timeless skincare.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  };
  console.log("Attempting to send OTP email...");
  const info = await transporter.sendMail(mailOptions);
  console.log("OTP email sent successfully");
  return info;
};

export { sendOTPEmail };
