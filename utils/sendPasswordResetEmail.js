import nodemailer from 'nodemailer';

// ── Shared transporter (reuse for all outgoing mail) ──────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/**
 * Sends a password-reset OTP email.
 *
 * @param {string} to        - Recipient email address
 * @param {string} otp       - Plain-text 6-digit OTP (hashed before storing in DB)
 * @param {string} firstName - Used in the greeting line
 */
export const sendPasswordResetEmail = async (to, otp, firstName = 'there') => {
  const mailOptions = {
    from: `"Tallow and Care" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Your password reset code',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Password Reset</title>
      </head>
      <body style="margin:0;padding:0;background:#f7f3ee;font-family:'Segoe UI',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ee;padding:40px 0;">
          <tr>
            <td align="center">
              <table width="520" cellpadding="0" cellspacing="0"
                     style="background:#ffffff;border-radius:12px;overflow:hidden;
                            box-shadow:0 2px 12px rgba(0,0,0,0.07);">

                <!-- Header -->
                <tr>
                  <td style="background:#4a7c59;padding:32px 40px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;
                               letter-spacing:0.5px;">Tallow and Care</h1>
                    <p style="margin:6px 0 0;color:#c8dfc0;font-size:13px;">
                      Natural skincare, naturally simple.
                    </p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:36px 40px;">
                    <p style="margin:0 0 16px;font-size:16px;color:#3a3a3a;line-height:1.6;">
                      Hi <strong>${firstName}</strong>,
                    </p>
                    <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.7;">
                      We received a request to reset the password for your account.
                      Use the code below — it expires in <strong>10 minutes</strong>.
                    </p>

                    <!-- OTP block -->
                    <div style="text-align:center;margin:28px 0;">
                      <div style="display:inline-block;background:#f0f7f2;border:2px solid #4a7c59;
                                  border-radius:10px;padding:18px 40px;">
                        <span style="font-size:38px;font-weight:800;letter-spacing:10px;
                                     color:#2d5a40;font-family:'Courier New',monospace;">
                          ${otp}
                        </span>
                      </div>
                    </div>

                    <p style="margin:0 0 12px;font-size:13px;color:#888;line-height:1.6;">
                      If you did not request a password reset, you can safely ignore this email.
                      Your password will not change.
                    </p>
                    <p style="margin:0;font-size:13px;color:#888;line-height:1.6;">
                      For security, never share this code with anyone.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background:#f7f3ee;padding:20px 40px;text-align:center;
                              border-top:1px solid #e8ddd0;">
                    <p style="margin:0;font-size:12px;color:#aaa;">
                      © ${new Date().getFullYear()} Tallow and Care. All rights reserved.
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

  await transporter.sendMail(mailOptions);
  console.log(`[sendPasswordResetEmail] ✅ Reset OTP sent to ${to}`);
};
