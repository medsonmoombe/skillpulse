import "server-only";
import nodemailer from "nodemailer";

type EmailAttachment = {
  filename: string;
  content: Buffer | string;
  contentType?: string;
};

type SendAppEmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  attachments?: EmailAttachment[];
};

export async function sendAppEmail(input: SendAppEmailInput) {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT ?? "587");
  const user = process.env.EMAIL_USER;
  const password = process.env.EMAIL_PASSWORD;
  const fromEmail = process.env.EMAIL_FROM;

  if (!host || !port || !user || !password || !fromEmail) {
    return false;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass: password,
    },
  });

  await transporter.sendMail({
    from: fromEmail,
    to: input.to,
    subject: input.subject,
    text: input.text,
    attachments: input.attachments,
  });

  return true;
}
