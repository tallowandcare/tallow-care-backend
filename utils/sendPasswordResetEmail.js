import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendPasswordResetEmail = async (to, otp, firstName = 'there') => {
  const { error } = await resend.emails.send({
    from: 'Tallow Care <noreply@tallowandcare.in>',
    to,
    subject: 'Your password reset code',
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8" /></head>
        <body style="margin:0;padding:0;background:#f7f3ee;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ee;padding:40px 0;">
            <tr><td align="center">
              <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="background:#4a7c59;padding:32px 40px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:22px;">Tallow and Care</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:36px 40px;">
                    <p style="font-size:16px;color:#3a3a3a;">Hi <strong>${firstName}</strong>,</p>
                    <p style="color:#555;">Use the code below to reset your password. Expires in <strong>10 minutes</strong>.</p>
                    <div style="text-align:center;margin:28px 0;">
                      <div style="display:inline-block;background:#f0f7f2;border:2px solid #4a7c59;border-radius:10px;padding:18px 40px;">
                        <span style="font-size:38px;font-weight:800;letter-spacing:10px;color:#2d5a40;font-family:'Courier New',monospace;">${otp}</span>
                      </div>
                    </div>
                    <p style="font-size:13px;color:#888;">If you did not request this, ignore this email.</p>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f7f3ee;padding:20px 40px;text-align:center;border-top:1px solid #e8ddd0;">
                    <p style="margin:0;font-size:12px;color:#aaa;">© ${new Date().getFullYear()} Tallow and Care. All rights reserved.</p>
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
  console.log(`[sendPasswordResetEmail] ✅ Reset OTP sent to ${to}`);
};