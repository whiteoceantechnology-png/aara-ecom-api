import { Injectable, Logger } from "@nestjs/common";
import { createHash } from "crypto";

export type MetaPurchaseEventParams = {
  /** Shared with the browser Meta Pixel Purchase event for deduplication. */
  eventId: string;
  /** Unix seconds. */
  eventTime: number;
  value: number;
  currency: string;
  orderId: string;
  numItems: number;
  contentIds: string[];
  contents: Array<{ id: string; quantity: number; item_price: number }>;
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
  /** `_fbp` browser cookie. */
  fbp?: string | null;
  /** `_fbc` browser cookie (or derived from `fbclid`). */
  fbc?: string | null;
  eventSourceUrl?: string | null;
};

/**
 * Meta (Facebook) Conversions API client — sends server-side Purchase events
 * so they can be deduplicated against the browser Pixel's Purchase event via
 * a shared `event_id`. Configured entirely from environment variables; never
 * throws so a Meta API outage can't break the payment/order confirmation flow.
 * https://developers.facebook.com/docs/marketing-api/conversions-api
 */
@Injectable()
export class MetaCapiService {
  private readonly logger = new Logger(MetaCapiService.name);

  private get pixelId(): string {
    return process.env.META_PIXEL_ID?.trim() ?? "";
  }

  private get accessToken(): string {
    return process.env.META_CAPI_ACCESS_TOKEN?.trim() ?? "";
  }

  private get apiVersion(): string {
    return process.env.META_CAPI_API_VERSION?.trim() || "v21.0";
  }

  /** Set only while testing in Meta Events Manager → Test Events; unset in production. */
  private get testEventCode(): string {
    return process.env.META_CAPI_TEST_EVENT_CODE?.trim() ?? "";
  }

  isConfigured(): boolean {
    return Boolean(this.pixelId && this.accessToken);
  }

  private hash(value: string): string {
    return createHash("sha256")
      .update(value.trim().toLowerCase())
      .digest("hex");
  }

  /** Digits only, leading trunk zero stripped, defaults to India (91) when no country code is present. */
  private normalizePhone(rawPhone: string): string {
    let digits = rawPhone.replace(/\D/g, "").replace(/^0+/, "");
    if (digits.length === 10) digits = `91${digits}`;
    return digits;
  }

  async sendPurchaseEvent(params: MetaPurchaseEventParams): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.warn(
        "Meta CAPI not configured (META_PIXEL_ID / META_CAPI_ACCESS_TOKEN) — skipping Purchase event",
      );
      return;
    }

    const userData: Record<string, unknown> = {};
    if (params.email) userData.em = [this.hash(params.email)];
    if (params.phone)
      userData.ph = [this.hash(this.normalizePhone(params.phone))];
    if (params.firstName) userData.fn = [this.hash(params.firstName)];
    if (params.lastName) userData.ln = [this.hash(params.lastName)];
    if (params.city) userData.ct = [this.hash(params.city)];
    if (params.state) userData.st = [this.hash(params.state)];
    if (params.postalCode) userData.zp = [this.hash(params.postalCode)];
    if (params.country) userData.country = [this.hash(params.country)];
    if (params.clientIpAddress)
      userData.client_ip_address = params.clientIpAddress;
    if (params.clientUserAgent)
      userData.client_user_agent = params.clientUserAgent;
    if (params.fbp) userData.fbp = params.fbp;
    if (params.fbc) userData.fbc = params.fbc;

    const payload = {
      data: [
        {
          event_name: "Purchase",
          event_time: params.eventTime,
          event_id: params.eventId,
          action_source: "website",
          ...(params.eventSourceUrl
            ? { event_source_url: params.eventSourceUrl }
            : {}),
          user_data: userData,
          custom_data: {
            currency: params.currency,
            value: params.value,
            content_ids: params.contentIds,
            contents: params.contents,
            content_type: "product",
            num_items: params.numItems,
            order_id: params.orderId,
          },
        },
      ],
      ...(this.testEventCode ? { test_event_code: this.testEventCode } : {}),
    };

    const url = `https://graph.facebook.com/${this.apiVersion}/${this.pixelId}/events?access_token=${encodeURIComponent(this.accessToken)}`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        this.logger.error(
          `Meta CAPI Purchase event failed for order ${params.orderId}: ${res.status} ${JSON.stringify(body)}`,
        );
        return;
      }
      const eventsReceived =
        (body as { events_received?: number })?.events_received ?? "?";
      this.logger.log(
        `Meta CAPI Purchase event sent for order ${params.orderId} (event_id=${params.eventId}, events_received=${eventsReceived})`,
      );
    } catch (err) {
      this.logger.error(
        `Meta CAPI request error for order ${params.orderId}: ${String(err)}`,
      );
    }
  }
}
