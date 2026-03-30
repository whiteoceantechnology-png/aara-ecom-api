import { Test, TestingModule } from "@nestjs/testing";
import { TaxController } from "./tax.controller";
import { TaxService } from "./tax.service";
import { IS_PUBLIC_KEY } from "../../auth/public.decorator";

describe("TaxController", () => {
  let controller: TaxController;
  const taxService = {
    findAll: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaxController],
      providers: [{ provide: TaxService, useValue: taxService }],
    }).compile();
    controller = module.get<TaxController>(TaxController);
  });

  it("findAll should delegate", async () => {
    taxService.findAll.mockResolvedValue([]);
    await controller.findAll();
    expect(taxService.findAll).toHaveBeenCalled();
  });

  it("create should delegate", async () => {
    taxService.create.mockResolvedValue({ id: 1 });
    await controller.create({ name: "GST", percent: 5 });
    expect(taxService.create).toHaveBeenCalledWith({ name: "GST", percent: 5 });
  });

  it("should mark findAll as @Public()", () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, TaxController.prototype.findAll),
    ).toBe(true);
  });

  it("should NOT mark create as @Public()", () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, TaxController.prototype.create),
    ).toBeUndefined();
  });
});
