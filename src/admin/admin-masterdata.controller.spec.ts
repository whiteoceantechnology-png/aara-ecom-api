import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, StreamableFile } from "@nestjs/common";
import { AdminMasterdataController } from "./admin-masterdata.controller";
import { AdminMasterdataService } from "./admin-masterdata.service";

describe("AdminMasterdataController", () => {
  let controller: AdminMasterdataController;
  const importProductsFromExcel = jest.fn();
  const buildProductTemplateBuffer = jest.fn(() => Buffer.from("PK\x03\x04"));
  const buildProductExportBuffer = jest.fn(() =>
    Promise.resolve(Buffer.from("PK\x03\x04")),
  );

  beforeEach(async () => {
    importProductsFromExcel.mockReset();
    buildProductTemplateBuffer.mockClear();
    buildProductExportBuffer.mockClear();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminMasterdataController],
      providers: [
        {
          provide: AdminMasterdataService,
          useValue: {
            importProductsFromExcel,
            buildProductTemplateBuffer,
            buildProductExportBuffer,
          },
        },
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
});
