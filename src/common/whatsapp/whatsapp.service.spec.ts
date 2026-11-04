import { WhatsAppService, normalizeRecipient } from "./whatsapp.service";

describe("WhatsAppService", () => {
  const envKeys = [
    "WHATSAPP_API_URL",
    "WHATSAPP_API_TOKEN",
    "WHATSAPP_FROM_NUMBER",
    "WHATSAPP_OVERRIDE_RECIPIENT",
  ] as const;
  const original = { ...process.env };
  let fetchMock: jest.Mock;
  let service: WhatsAppService;

  const message = {
    to: "8122031856",
    templateId: "aaraa_home_care",
    variables: {
      name: "AARAA HOMECARE",
      order_id: "73211",
      amount: "Rs.11643.06",
    },
  };

  beforeEach(() => {
    for (const key of envKeys) delete process.env[key];
    process.env.WHATSAPP_API_TOKEN = "kurl_test_token";
    process.env.WHATSAPP_FROM_NUMBER = "919999999999";
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(""),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    service = new WhatsAppService();
    jest.spyOn(service["logger"], "log").mockImplementation(() => undefined);
    jest.spyOn(service["logger"], "warn").mockImplementation(() => undefined);
    jest.spyOn(service["logger"], "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env = { ...original };
    jest.restoreAllMocks();
  });

  it("posts the template payload with bearer auth and India-normalized number", async () => {
    await service.sendTemplateMessage(message);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://kural.nzen.in/App/api/whatsapp/sendmessage");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      Authorization: "Bearer kurl_test_token",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(init.body)).toEqual({
      from: "919999999999",
      to: "918122031856",
      template_id: "aaraa_home_care",
      variables: {
        name: "AARAA HOMECARE",
        order_id: "73211",
        amount: "Rs.11643.06",
      },
    });
  });

  it("sends to the override recipient instead of the customer when set", async () => {
    process.env.WHATSAPP_OVERRIDE_RECIPIENT = "8122031856";
    await service.sendTemplateMessage({ ...message, to: "9876543210" });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).to).toBe("918122031856");
  });

  it("does nothing when token or from-number is missing", async () => {
    delete process.env.WHATSAPP_API_TOKEN;
    service = new WhatsAppService();
    jest.spyOn(service["logger"], "log").mockImplementation(() => undefined);

    await service.sendTemplateMessage(message);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips when the recipient has no usable digits", async () => {
    await service.sendTemplateMessage({ ...message, to: "" });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("logs and does not throw when the gateway responds with an error", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve("unauthorized"),
    });

    await expect(service.sendTemplateMessage(message)).resolves.toBeUndefined();
    expect(service["logger"].error).toHaveBeenCalledWith(
      expect.stringContaining("401 unauthorized"),
    );
  });

  it("does not throw when the network call fails", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNRESET"));

    await expect(service.sendTemplateMessage(message)).resolves.toBeUndefined();
    expect(service["logger"].error).toHaveBeenCalledWith(
      expect.stringContaining("ECONNRESET"),
    );
  });
});

describe("normalizeRecipient", () => {
  it.each([
    ["8122031856", "918122031856"],
    ["+91 81220 31856", "918122031856"],
    ["918122031856", "918122031856"],
    ["", ""],
    [null, ""],
    [undefined, ""],
  ])("normalizes %p to %p", (input, expected) => {
    expect(normalizeRecipient(input)).toBe(expected);
  });
});
