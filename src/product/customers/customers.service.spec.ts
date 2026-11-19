import { ConflictException, Logger } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { MailService } from "../../common/mail/mail.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CustomersService } from "./customers.service";

const mockSendMail = jest.fn();
jest.mock("nodemailer", () => ({
  createTransport: () => ({ sendMail: mockSendMail }),
}));

describe("CustomersService registration welcome email", () => {
  const dto = {
    name: "John & <Doe>",
    email: " John@Example.com ",
    password: "example-password",
  };
  const customer = { id: 1, name: dto.name, email: "john@example.com" };
  const findUnique = jest.fn();
  const create = jest.fn();
  let service: CustomersService;

  beforeEach(async () => {
    jest.replaceProperty(process, "env", {
      ...process.env,
      SMTP_HOST: "smtp.example.com",
    });
    findUnique.mockReset().mockResolvedValue(null);
    create.mockReset().mockResolvedValue(customer);
    mockSendMail.mockReset().mockResolvedValue(undefined);
    const moduleRef = await Test.createTestingModule({
      providers: [
        CustomersService,
        MailService,
        {
          provide: PrismaService,
          useValue: { customer: { findUnique, create } },
        },
      ],
    }).compile();
    service = moduleRef.get(CustomersService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("sends a personalized welcome email without holding up registration", async () => {
    mockSendMail.mockReturnValue(new Promise(() => {}));

    await expect(service.register(dto)).resolves.toEqual(customer);

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: customer.email,
        subject: "Welcome to AARAA HOMECARE!",
        text: expect.stringContaining(
          `Your Account Details:\n- Name: ${customer.name}\n- Email: ${customer.email}`,
        ),
        html: expect.stringContaining("Dear John &amp; &lt;Doe&gt;,"),
      }),
    );
    const [{ html, text }] = mockSendMail.mock.calls[0];
    expect(html).not.toContain(dto.password);
    expect(text).not.toContain(dto.password);
  });

  it("does not email an existing customer who tries to register again", async () => {
    findUnique.mockResolvedValue(customer);

    await expect(service.register(dto)).rejects.toThrow(ConflictException);
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("does not send a welcome email when customer creation fails", async () => {
    const error = new Error("Database unavailable");
    create.mockRejectedValue(error);

    await expect(service.register(dto)).rejects.toThrow(error);
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("logs SMTP failures without failing registration", async () => {
    const logger = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => {});
    mockSendMail.mockRejectedValue(new Error("SMTP unavailable"));

    await expect(service.register(dto)).resolves.toEqual(customer);
    expect(logger).toHaveBeenCalledWith(
      expect.stringContaining("SMTP unavailable"),
    );
  });
});
