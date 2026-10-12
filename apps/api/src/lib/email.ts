import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../env.js';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    if (!env.EMAIL_USER || !env.EMAIL_PASS) {
      console.warn('EMAIL_USER or EMAIL_PASS not set in environment. Emails will be logged to console.');
    }

    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: env.EMAIL_USER || '',
        pass: env.EMAIL_PASS || '',
      },
    });
  }

  return transporter;
}

export async function sendVerificationEmail(to: string, name: string, code: string): Promise<void> {
  const mailer = getTransporter();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Verify your LearnStack account</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0F1419; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E8EDF3;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0F1419; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #1A2230; border: 1px solid #2A3448; border-radius: 12px; padding: 36px 32px; text-align: left;">
          <!-- Header -->
          <tr>
            <td style="padding-bottom: 24px; border-bottom: 1px solid #2A3448;">
              <table border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background-color: rgba(20, 184, 166, 0.15); border: 1px solid #14B8A6; border-radius: 8px; width: 36px; height: 36px; text-align: center; vertical-align: middle;">
                    <span style="color: #14B8A6; font-size: 18px; font-weight: bold;">⚡</span>
                  </td>
                  <td style="padding-left: 12px;">
                    <span style="color: #E8EDF3; font-size: 18px; font-weight: 600; letter-spacing: -0.02em;">LearnStack</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding-top: 28px;">
              <h1 style="color: #E8EDF3; font-size: 24px; font-weight: 600; margin: 0 0 12px 0; letter-spacing: -0.02em;">
                Verify your email address
              </h1>
              <p style="color: #8B95A7; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                Hi ${name}, welcome to LearnStack. Enter the 6-digit verification code below to verify your account and complete setup:
              </p>

              <!-- OTP Code Display Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center" style="background-color: #0F1419; border: 1px solid #2A3448; border-radius: 8px; padding: 20px;">
                    <span style="font-family: 'JetBrains Mono', monospace, Courier; font-size: 34px; font-weight: 700; letter-spacing: 8px; color: #14B8A6;">
                      ${code}
                    </span>
                  </td>
                </tr>
              </table>

              <p style="color: #8B95A7; font-size: 13px; line-height: 1.5; margin: 0 0 8px 0;">
                ⏱️ This code will expire in <strong>10 minutes</strong>.
              </p>
              <p style="color: #8B95A7; font-size: 13px; line-height: 1.5; margin: 0;">
                If you did not sign up for a LearnStack account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; border-top: 1px solid #2A3448; margin-top: 24px; text-align: center;">
              <span style="color: #8B95A7; font-size: 12px;">
                LearnStack Learning Platform • Multi-tenant Academy
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  // Always log code to server log for immediate debugging / verification visibility
  console.log(`[EmailService] Verification OTP for ${to}: ${code}`);

  if (env.EMAIL_USER && env.EMAIL_PASS) {
    try {
      await mailer.sendMail({
        from: `"LearnStack" <${env.EMAIL_USER}>`,
        to,
        subject: 'Verify your LearnStack account',
        html,
      });
      console.log(`[EmailService] Verification email dispatched to ${to}`);
    } catch (err) {
      console.error('[EmailService] Failed to send email via SMTP:', err);
      // In development or if SMTP fails, do not crash the app, code is logged above
    }
  }
}
