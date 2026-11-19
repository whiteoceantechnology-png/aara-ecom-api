import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";

export type OrderConfirmationEmailParams = {
  to: string;
  customerName: string;
  orderNumber: string;
  totalAmount: number | string;
  paymentMethod?: string | null;
};

export type OrderShippedEmailParams = {
  to: string;
  customerName: string;
  orderNumber: string;
  trackingId?: string | null;
  trackingImageUrl?: string | null;
  courierName?: string | null;
};

function escapeHtmlText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/**
 * Thin SMTP wrapper (nodemailer). Transport is only built when SMTP_HOST is
 * configured — in environments without mail credentials, sends are skipped
 * (logged) instead of throwing, so application flows never fail on email.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly fromAddress: string;

  constructor() {
    this.fromAddress = process.env.MAIL_FROM ?? "no-reply@aaraahomecare.com";
    this.transporter = this.buildTransport();
  }

  private buildTransport(): nodemailer.Transporter | null {
    const host = process.env.SMTP_HOST;
    if (!host) {
      this.logger.warn(
        "SMTP_HOST not configured — emails will be logged, not sent.",
      );
      return null;
    }
    return nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }

  async sendCustomerWelcomeEmail(params: {
    to: string;
    customerName: string;
  }): Promise<void> {
    const name = escapeHtmlText(params.customerName);
    const email = escapeHtmlText(params.to);
    const thanks =
      "Thank you for registering with us. We're delighted to have you as part of our family.";
    const accountCreated =
      "Your account has been successfully created. You can now log in to our website and explore our products.";
    const closing =
      "Thank you for choosing AARAA HOMECARE. We look forward to serving you!";
    await this.send({
      to: params.to,
      subject: "Welcome to AARAA HOMECARE!",
      text: [
        `Dear ${params.customerName},`,
        "Welcome to AARAA HOMECARE!",
        thanks,
        accountCreated,
        `Your Account Details:\n- Name: ${params.customerName}\n- Email: ${params.to}`,
        closing,
      ].join("\n\n"),
      html: `
        <p>Dear ${name},</p>
        <p>Welcome to <strong>AARAA HOMECARE!</strong></p>
        <p>${thanks}</p>
        <p>${accountCreated}</p>
        <p><strong>Your Account Details:</strong></p>
        <ul><li>Name: ${name}</li><li>Email: ${email}</li></ul>
        <p>${closing}</p>
      `,
    });
  }

  async sendOrderConfirmationEmail(
    params: OrderConfirmationEmailParams,
  ): Promise<void> {
    const amount = Number(params.totalAmount).toFixed(2);
    await this.send({
      to: params.to,
      subject: `Order Confirmed — ${params.orderNumber}`,
      html: `
        <p>Hi ${params.customerName},</p>
        <p>Your order <strong>${params.orderNumber}</strong> has been confirmed.</p>
        <p>Total: <strong>₹${amount}</strong>${
          params.paymentMethod ? ` (${params.paymentMethod})` : ""
        }</p>
        <p>We'll notify you again once your order ships.</p>
        <p>Thank you for shopping with Aaraa Homecare.</p>
      `,
    });
  }

  async sendOrderShippedEmail(params: OrderShippedEmailParams): Promise<void> {
    await this.send({
      to: params.to,
      subject: `Order Shipped — ${params.orderNumber}`,
      html: `
        <p>Hi ${params.customerName},</p>
        <p>Your order <strong>${params.orderNumber}</strong> has been shipped${
          params.courierName ? ` via ${params.courierName}` : ""
        }.</p>
        ${
          params.trackingId
            ? `<p>Tracking ID: <strong>${params.trackingId}</strong></p>`
            : ""
        }
        ${
          params.trackingImageUrl
            ? `<p><img src="${params.trackingImageUrl}" alt="Tracking" style="max-width:100%;height:auto" /></p>`
            : ""
        }
        <p>Thank you for shopping with Aaraa Homecare.</p>
      `,
    });
  }

  private async send(message: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
    if (!message.to) {
      this.logger.warn(`Skipping email "${message.subject}" — no recipient`);
      return;
    }
    if (!this.transporter) {
      this.logger.log(`[mail skipped] ${message.subject} -> ${message.to}`);
      return;
    }
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        ...message,
      });
    } catch (err) {
      this.logger.error(
        `Failed to send email "${message.subject}" to ${message.to}: ${
          (err as Error).message
        }`,
      );
    }
  }
}
