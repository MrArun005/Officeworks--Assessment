import nodemailer, { type Transporter } from "nodemailer";
import type { EmailMessage, EmailSender } from "./emailSender.js";

export interface SmtpOptions {
  host: string;
  port: number;
  user?: string;
  pass?: string;
}

/**
 * SMTP is the common denominator: Mailpit locally, and Amazon SES (or most
 * other providers) in production with only configuration changed.
 */
export class SmtpEmailSender implements EmailSender {
  private readonly transporter: Transporter;

  constructor(options: SmtpOptions) {
    this.transporter = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      auth:
        options.user && options.pass
          ? { user: options.user, pass: options.pass }
          : undefined,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail(message);
  }
}
