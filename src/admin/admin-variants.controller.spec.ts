import { Test, TestingModule } from "@nestjs/testing";
import { StreamableFile } from "@nestjs/common";
import { AdminVariantsController } from "./admin-variants.controller";
import { VariantsService } from "../product/variants/variants.service";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import { CreateVariantDto } from "../product/dto/variant.dto";
import { PrismaService } from "../prisma/prisma.service";
import { AdminMasterdataService } from "./admin-masterdata.service";

const mockVariantsService = {
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

const mockPrisma = {
  notificationSettings: { findUnique: jest.fn() },
  productVariant: { findMany: jest.fn() },
};

const mockMasterdata = {
  buildVariantTemplateBufferAsync: jest.fn(() =>
    Promise.resolve(Buffer.from("PK\x03\x04")),
  ),
  buildVariantExportBuffer: jest.fn(() =>
    Promise.resolve(Buffer.from("PK\x03\x04")),
  ),
  importVariantsFromExcel: jest.fn(),
};

describe("AdminVariantsController", () => {
  let controller: AdminVariantsController;
  let service: typeof mockVariantsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminVariantsController],
      providers: [
        { provide: VariantsService, useValue: mockVariantsService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AdminMasterdataService, useValue: mockMasterdata },
        AdminRoleGuard,
      ],
    }).compile();

    controller = module.get<AdminVariantsController>(AdminVariantsController);
    service = module.get(VariantsService);
    jest.clearAllMocks();
  });

  it("should create a variant", async () => {
    const dto: CreateVariantDto = {
      productId: 1,
      variantName: "ruby red shirt",
      packSizeId: 1,
      price: 31,
      discountedPrice: 28,
      sku: "SKU-1",
      imagePath: ["/images/products/a.png", "/images/products/b.png"],
    };
    const created = { id: 1, ...dto };
    service.create.mockResolvedValue(created);
    const result = await controller.create(dto);
    expect(result).toEqual(created);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it("should update a variant", async () => {
    service.update.mockResolvedValue({ id: 1, price: 40 });
    const result = await controller.update(1, { price: 40 });
    expect(result).toEqual({ id: 1, price: 40 });
    expect(service.update).toHaveBeenCalledWith(1, { price: 40 });
  });

  it("should remove a variant", async () => {
    service.remove.mockResolvedValue({
      message: "Variant deleted successfully",
    });
    const result = await controller.remove(1);
    expect(result).toEqual({ message: "Variant deleted successfully" });
    expect(service.remove).toHaveBeenCalledWith(1);
  });

  it("downloadTemplate returns StreamableFile", async () => {
    const out = await controller.downloadTemplate();
    expect(out).toBeInstanceOf(StreamableFile);
    expect(mockMasterdata.buildVariantTemplateBufferAsync).toHaveBeenCalled();
  });

  it("importVariants delegates to masterdata", async () => {
    mockMasterdata.importVariantsFromExcel.mockResolvedValue({
      summary: {
        totalRows: 1,
        created: 1,
        updated: 0,
        failed: 0,
        duplicateSkusInFile: 0,
      },
      created: [],
      updated: [],
      failed: [],
    });
    const buf = Buffer.from("x");
    await controller.importVariants({
      buffer: buf,
      originalname: "v.xlsx",
    } as Express.Multer.File);
    expect(mockMasterdata.importVariantsFromExcel).toHaveBeenCalledWith(buf);
  });
});
