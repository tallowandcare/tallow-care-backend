import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const sendOTPEmail = async (toEmail, otp, userName = 'there') => {
  const { error } = await resend.emails.send({
    from: 'Tallow Care <noreply@tallowandcare.in>',
    to: toEmail,
    subject: 'Your Tallow Care Verification Code',
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8" /></head>
        <body style="margin:0;padding:0;background:#fdf6ee;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf6ee;padding:40px 0;">
            <tr><td align="center">
              <table width="520" cellpadding="0" cellspacing="0" style="background:#fffaf4;border-radius:16px;overflow:hidden;">
                <tr>
                  <td style="background:#2a2318;padding:32px 40px;text-align:center;">
                    <h1 style="margin:0;color:#fdf6ee;font-size:24px;">Tallow &amp; Care</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px;">
                    <h2 style="margin:0 0 8px;color:#2a2318;">Verify your email, ${userName} 👋</h2>
                    <p style="color:#6b5c47;">Enter the code below. Expires in <strong>5 minutes</strong>.</p>
                    <div style="background:#fdf6ee;border:1.5px solid #e8ddd0;border-radius:12px;padding:28px;text-align:center;margin:24px 0;">
                      <div style="font-size:40px;font-weight:700;color:#2a2318;letter-spacing:12px;font-family:monospace;">${otp}</div>
                    </div>
                    <p style="color:#6b5c47;font-size:14px;">If you didn't request this, ignore this email.</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
      </html>
    `,
  });

  if (error) throw new Error(error.message);
  console.log("OTP email sent via Resend");
};

export { sendOTPEmail };