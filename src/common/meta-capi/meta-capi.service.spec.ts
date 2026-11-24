import { MetaCapiService } from "./meta-capi.service";

describe("MetaCapiService", () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;
  const service = new MetaCapiService();

  beforeEach(() => {
    process.env = {
      META_PIXEL_ID: "4653538934931886",
      META_CAPI_ACCESS_TOKEN: "test-token",
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ events_received: 1 }),
    });
  });

  afterAll(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it("enables commerce events only for testing or after explicit activation", () => {
    expect(service.commerceEventsEnabled()).toBe(false);
    process.env.META_CAPI_TEST_EVENT_CODE = "TEST123";
    expect(service.commerceEventsEnabled()).toBe(true);
    delete process.env.META_CAPI_TEST_EVENT_CODE;
    process.env.META_CAPI_COMMERCE_EVENTS_ENABLED = "true";
    expect(service.commerceEventsEnabled()).toBe(true);
  });

  it("forwards the browser event ID and matching fields to Meta", async () => {
    await service.sendAddToCartEvent({
      eventId: "shared-id",
      eventTime: 123,
      value: 100,
      currency: "INR",
      numItems: 1,
      contentIds: ["4"],
      contents: [{ id: "4", quantity: 1, item_price: 100 }],
      fbp: "browser-cookie",
      fbc: "click-cookie",
      eventSourceUrl: "https://example.com/product",
    });
    const fetchMock = global.fetch as jest.Mock;
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("/4653538934931886/events?");
    expect(JSON.parse(options.body)).toMatchObject({
      data: [
        {
          event_name: "AddToCart",
          event_id: "shared-id",
          event_source_url: "https://example.com/product",
          user_data: { fbp: "browser-cookie", fbc: "click-cookie" },
        },
      ],
    });
  });
});
