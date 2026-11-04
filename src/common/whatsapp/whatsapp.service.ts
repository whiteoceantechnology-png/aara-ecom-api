import { Injectable, Logger } from "@nestjs/common";

export type WhatsAppTemplateMessage = {
  to: string;
  templateId: string;
  variables: Record<string, string>;
};

const DEFAULT_API_URL = "https://kural.nzen.in/App/api/whatsapp/sendmessage";

/**
 * Thin client for the Kural WhatsApp gateway. Like MailService, it is a no-op
 * (logged) when credentials are missing, and delivery failures never throw,
 * so order/shipment flows are not broken by messaging problems.
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  private get apiUrl(): string {
    return process.env.WHATSAPP_API_URL?.trim() || DEFAULT_API_URL;
  }

  private get apiToken(): string {
    return process.env.WHATSAPP_API_TOKEN?.trim() ?? "";
  }

  private get fromNumber(): string {
    return process.env.WHATSAPP_FROM_NUMBER?.trim() ?? "";
  }

  /** When set, every message goes here instead of the customer (testing). */
  private get overrideRecipient(): string {
    return process.env.WHATSAPP_OVERRIDE_RECIPIENT?.trim() ?? "";
  }

  async sendTemplateMessage(message: WhatsAppTemplateMessage): Promise<void> {
    if (!this.apiToken || !this.fromNumber) {
      this.logger.log(
        `[whatsapp skipped] WHATSAPP_API_TOKEN/WHATSAPP_FROM_NUMBER not set -> ${message.to}`,
      );
      return;
    }

    const to = normalizeRecipient(this.overrideRecipient || message.to);
    if (!to) {
      this.logger.warn(
        `Skipping WhatsApp template ${message.templateId} — no recipient`,
      );
      return;
    }

    try {
      const res = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.fromNumber,
          to,
          template_id: message.templateId,
          variables: message.variables,
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        this.logger.error(
          `WhatsApp template ${message.templateId} to ${to} failed: ${res.status} ${body}`,
        );
        return;
      }
      this.logger.log(
        `WhatsApp template ${message.templateId} sent to ${to}${
          this.overrideRecipient ? " (override recipient)" : ""
        }`,
      );
    } catch (err) {
      this.logger.error(
        `WhatsApp template ${message.templateId} to ${to} threw: ${
          (err as Error).message
        }`,
      );
    }
  }
}

/**
 * Digits only, with the India country code added to bare 10-digit mobiles.
 * Returns "" when nothing usable is left.
 */
export function normalizeRecipient(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.length === 10 ? `91${digits}` : digits;
}
