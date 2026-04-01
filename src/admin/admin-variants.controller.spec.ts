import { Test, TestingModule } from "@nestjs/testing";
import { AdminVariantsController } from "./admin-variants.controller";
import { VariantsService } from "../product/variants/variants.service";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import { CreateVariantDto } from "../product/dto/variant.dto";

const mockVariantsService = {
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe("AdminVariantsController", () => {
  let controller: AdminVariantsController;
  let service: typeof mockVariantsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminVariantsController],
      providers: [
        { provide: VariantsService, useValue: mockVariantsService },
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
      packSizeId: 1,
      price: 31,
      sku: "SKU-1",
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
});
