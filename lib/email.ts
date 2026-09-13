import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendLoginCode(email: string, code: string) {
  // No API key set (e.g. local dev) — just log the code so you can log in.
  if (!resend) {
    console.log(`[dev] login code for ${email}: ${code}`);
    return;
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "sign-in@yourdomain.com",
    to: email,
    subject: `${code} is your sign-in code`,
    text: `Your sign-in code is ${code}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
  });
}
