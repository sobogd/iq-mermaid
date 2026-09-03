// OTP email via the same SMTP box iq-rest uses. The sender is read from
// FROM_EMAIL (noreply@iq-rest.com); the recipient is always the address the
// visitor typed. If SMTP is not configured the send is skipped silently so the
// local/dev flow keeps working without mail.
import nodemailer from "nodemailer";

export async function sendOtpEmail(email: string, code: string): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.FROM_EMAIL || "noreply@iq-rest.com";

  if (!host || !user || !pass) {
    // Never log the code or recipient — both are PII / auth secrets.
    console.warn("[mail] SMTP not configured — OTP email skipped");
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  await transporter.sendMail({
    from,
    to: email,
    subject: `IQ Mermaid — your sign-in code: ${code}`,
    text: `Your IQ Mermaid sign-in code is ${code}. It expires in 5 minutes.\n\nIf you didn't ask for a code, you can ignore this email.`,
    html: `
      <div style="padding:32px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a">
        <p style="margin:0 0 20px;font-size:17px;line-height:1.6">Your IQ Mermaid sign-in code is:</p>
        <div style="margin:0 0 24px;font-size:40px;font-weight:700;letter-spacing:8px">${code}</div>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#666">It expires in 5 minutes. If you didn't ask for a code, you can ignore this email.</p>
      </div>`,
  });
}
