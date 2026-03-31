import { Test, TestingModule } from "@nestjs/testing";
import { ReviewsController } from "./reviews.controller";
import { ReviewsService } from "./reviews.service";
import { IS_PUBLIC_KEY } from "../../auth/public.decorator";

const mockReviewsService = {
  create: jest.fn(),
  remove: jest.fn(),
};

describe("ReviewsController", () => {
  let controller: ReviewsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [{ provide: ReviewsService, useValue: mockReviewsService }],
    }).compile();

    controller = module.get<ReviewsController>(ReviewsController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create()", () => {
    it("should create a review", async () => {
      const dto = {
        productId: 1,
        rating: 5,
        comment: "Great",
        orderId: 10,
      };
      const review = { id: 99, ...dto, customerId: 5 };
      mockReviewsService.create.mockResolvedValue(review);

      const result = await controller.create(5, dto);

      expect(mockReviewsService.create).toHaveBeenCalledWith(5, dto);
      expect(result).toEqual(review);
    });
  });

  describe("remove()", () => {
    it("should delete own review", async () => {
      mockReviewsService.remove.mockResolvedValue({ deleted: true });

      const result = await controller.remove(5, 99);

      expect(mockReviewsService.remove).toHaveBeenCalledWith(99, 5);
      expect(result).toEqual({ deleted: true });
    });
  });

  describe("auth decorators", () => {
    it("should have @ApiBearerAuth() on the controller", () => {
      const metadata = Reflect.getMetadata(
        "swagger/apiSecurity",
        ReviewsController,
      );
      expect(metadata).toEqual([{ bearer: [] }]);
    });

    it("should NOT mark create as @Public()", () => {
      expect(
        Reflect.getMetadata(IS_PUBLIC_KEY, ReviewsController.prototype.create),
      ).toBeUndefined();
    });
  });
});
