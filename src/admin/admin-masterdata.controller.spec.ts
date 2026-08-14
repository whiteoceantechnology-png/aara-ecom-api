import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, StreamableFile } from "@nestjs/common";
import { AdminMasterdataController } from "./admin-masterdata.controller";
import { AdminMasterdataService } from "./admin-masterdata.service";
import { AdminRoleGuard } from "../auth/admin-role.guard";

describe("AdminMasterdataController", () => {
  let controller: AdminMasterdataController;
  const importProductsFromExcel = jest.fn();
  const importVariantsFromExcel = jest.fn();
  const buildProductTemplateBuffer = jest.fn(() => Buffer.from("PK\x03\x04"));
  const buildProductExportBuffer = jest.fn(() =>
    Promise.resolve(Buffer.from("PK\x03\x04")),
  );
  const buildVariantTemplateBufferAsync = jest.fn(() =>
    Promise.resolve(Buffer.from("PK\x03\x04")),
  );
  const buildVariantExportBuffer = jest.fn(() =>
    Promise.resolve(Buffer.from("PK\x03\x04")),
  );

  beforeEach(async () => {
    importProductsFromExcel.mockReset();
    importVariantsFromExcel.mockReset();
    buildProductTemplateBuffer.mockClear();
    buildProductExportBuffer.mockClear();
    buildVariantTemplateBufferAsync.mockClear();
    buildVariantExportBuffer.mockClear();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminMasterdataController],
      providers: [
        {
          provide: AdminMasterdataService,
          useValue: {
            importProductsFromExcel,
            importVariantsFromExcel,
            buildProductTemplateBuffer,
            buildProductExportBuffer,
            buildVariantTemplateBufferAsync,
            buildVariantExportBuffer,
          },
        },
        AdminRoleGuard,
      ],
    }).compile();

    controller = module.get<AdminMasterdataController>(
      AdminMasterdataController,
    );
  });

  it("rejects missing file", async () => {
    await expect(
      controller.importProducts(undefined as unknown as Express.Multer.File),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects non-excel extension", async () => {
    await expect(
      controller.importProducts({
        buffer: Buffer.from("x"),
        originalname: "a.csv",
      } as Express.Multer.File),
    ).rejects.toThrow(BadRequestException);
  });

  it("delegates to service for .xlsx", async () => {
    const buf = Buffer.from("x");
    importProductsFromExcel.mockResolvedValue({
      summary: { totalRows: 1, created: 1, updated: 0, failed: 0 },
      created: [{ row: 2, id: 1, name: "N" }],
      updated: [],
      failed: [],
    });
    const result = await controller.importProducts({
      buffer: buf,
      originalname: "products.xlsx",
    } as Express.Multer.File);
    expect(importProductsFromExcel).toHaveBeenCalledWith(buf);
    expect(result.summary.created).toBe(1);
  });

  it("downloadTemplate returns StreamableFile", () => {
    const out = controller.downloadTemplate();
    expect(out).toBeInstanceOf(StreamableFile);
    expect(buildProductTemplateBuffer).toHaveBeenCalled();
  });

  it("exportProducts returns StreamableFile", async () => {
    const out = await controller.exportProducts();
    expect(out).toBeInstanceOf(StreamableFile);
    expect(buildProductExportBuffer).toHaveBeenCalled();
  });

  it("uploadVariants rejects missing file", async () => {
    await expect(
      controller.uploadVariants(undefined as unknown as Express.Multer.File),
    ).rejects.toThrow(BadRequestException);
  });

  it("importVariants / uploadVariants delegate to service", async () => {
    const buf = Buffer.from("x");
    importVariantsFromExcel.mockResolvedValue({
      summary: {
        totalRows: 1,
        created: 1,
        updated: 0,
        failed: 0,
        duplicateSkusInFile: 0,
      },
      created: [{ row: 2, id: 1, sku: "SKU-1", productId: 1 }],
      updated: [],
      failed: [],
    });
    const result = await controller.importVariants({
      buffer: buf,
      originalname: "variants.xlsx",
    } as Express.Multer.File);
    expect(importVariantsFromExcel).toHaveBeenCalledWith(buf);
    expect(result.summary.created).toBe(1);

    await controller.uploadVariants({
      buffer: buf,
      originalname: "variants.xlsx",
    } as Express.Multer.File);
    expect(importVariantsFromExcel).toHaveBeenCalledTimes(2);
  });

  it("downloadVariantTemplate returns StreamableFile", async () => {
    const out = await controller.downloadVariantTemplate();
    expect(out).toBeInstanceOf(StreamableFile);
    expect(buildVariantTemplateBufferAsync).toHaveBeenCalled();
  });

  it("exportVariants returns StreamableFile", async () => {
    const out = await controller.exportVariants();
    expect(out).toBeInstanceOf(StreamableFile);
    expect(buildVariantExportBuffer).toHaveBeenCalled();
  });
});
