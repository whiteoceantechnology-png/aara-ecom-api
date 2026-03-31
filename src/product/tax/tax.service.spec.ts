import { Test, TestingModule } from "@nestjs/testing";
import { TaxService } from "./tax.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("TaxService", () => {
  let service: TaxService;
  const prisma = {
    tax: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [TaxService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<TaxService>(TaxService);
  });

  it("findAll should return ordered taxes", async () => {
    prisma.tax.findMany.mockResolvedValue([
      { id: 1, name: "GST 5%", percent: 5 },
    ]);
    const rows = await service.findAll();
    expect(prisma.tax.findMany).toHaveBeenCalledWith({
      orderBy: { id: "asc" },
    });
    expect(rows).toHaveLength(1);
  });

  it("create should trim name", async () => {
    prisma.tax.create.mockResolvedValue({ id: 2 });
    await service.create({ name: "  VAT 12%  ", percent: 12 });
    expect(prisma.tax.create).toHaveBeenCalledWith({
      data: { name: "VAT 12%", percent: 12 },
    });
  });
});
