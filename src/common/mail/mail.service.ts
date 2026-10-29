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
  courierName?: string | null;
};

/**
 * Thin SMTP wrapper (nodemailer). Transport is only built when SMTP_HOST is
 * configured — in environments without mail credentials, sends are skipped
 * (logged) instead of throwing, so order/shipment flows never fail on email.
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
        "SMTP_HOST not configured — order emails will be logged, not sent.",
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
        <p>Thank you for shopping with Aaraa Homecare.</p>
      `,
    });
  }

  private async send(message: {
    to: string;
    subject: string;
    html: string;
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
        to: message.to,
        subject: message.subject,
        html: message.html,
      });
    } catch (err) {
      // Email delivery failures must never break order/shipment flows.
      this.logger.error(
        `Failed to send email "${message.subject}" to ${message.to}: ${
          (err as Error).message
        }`,
      );
    }
  }
}
