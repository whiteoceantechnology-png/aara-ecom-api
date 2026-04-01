import { Test, TestingModule } from "@nestjs/testing";
import { VariantsController } from "./variants.controller";
import { VariantsService } from "./variants.service";
import { IS_PUBLIC_KEY } from "../../auth/public.decorator";

const mockVariantsService = {
  listPackSizes: jest.fn(),
};

describe("VariantsController", () => {
  let controller: VariantsController;
  let service: typeof mockVariantsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VariantsController],
      providers: [{ provide: VariantsService, useValue: mockVariantsService }],
    }).compile();

    controller = module.get<VariantsController>(VariantsController);
    service = module.get(VariantsService);
    jest.clearAllMocks();
  });

  describe("listPackSizes", () => {
    it("should return pack sizes from service", async () => {
      const payload = { packSizes: [], _hint: "hint" };
      mockVariantsService.listPackSizes.mockResolvedValue(payload);
      const result = await controller.listPackSizes();
      expect(result).toEqual(payload);
      expect(service.listPackSizes).toHaveBeenCalled();
    });

    it("should mark listPackSizes as @Public()", () => {
      const isPublic = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        VariantsController.prototype.listPackSizes,
      );
      expect(isPublic).toBe(true);
    });
  });

  describe("auth decorators", () => {
    it("should have @ApiBearerAuth() on the controller", () => {
      const metadata = Reflect.getMetadata(
        "swagger/apiSecurity",
        VariantsController,
      );
      expect(metadata).toEqual([{ bearer: [] }]);
    });
  });
});
