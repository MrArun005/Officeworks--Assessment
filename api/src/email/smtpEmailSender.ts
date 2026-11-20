import nodemailer, { type Transporter } from "nodemailer";
import type { EmailMessage, EmailSender } from "./emailSender.js";

export interface SmtpOptions {
  host: string;
  port: number;
  /**
   * TLS from the first byte when true; STARTTLS upgrade (when offered) when
   * false. Left undefined, nodemailer decides by port: 465 means TLS.
   */
  secure?: boolean;
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
      secure: options.secure,
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
