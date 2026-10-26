import nodemailer from 'nodemailer';
import { env } from '../config/env';

/**
 * mailer used by email verification and password reset.
 *
 * If SMTP_HOST is not configured (e.g. local dev, or this sandboxed
 * environment where no real mail account is available), emails are
 * logged to the console instead of sent. The rest of the flow (token
 * generation, hashing, expiry, verification) runs exactly the same way
 * either way, so the feature is fully testable without real SMTP
 * credentials -- only actual delivery requires them, and that's an
 * infrastructure detail the operator supplies via .env, not something
 * that needs different code paths.
 */
let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;
let loggedMissingConfig = false;

function getTransporter() {
  if (!env.smtp.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }
  return transporter;
}

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendMail(message: MailMessage): Promise<void> {
  const t = getTransporter();
  if (!t) {
    if (!loggedMissingConfig) {
      console.warn(
        '[mailer] SMTP_HOST is not set — emails will be logged to the console instead of sent. ' +
        'Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM in .env to send real email.',
      );
      loggedMissingConfig = true;
    }
    console.log(`[mailer] (dev fallback) To: ${message.to} | Subject: ${message.subject}\n${message.text}`);
    return;
  }

  await t.sendMail({
    from: env.smtp.from,
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });
}
