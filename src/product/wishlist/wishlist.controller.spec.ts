import { Test, TestingModule } from "@nestjs/testing";
import { WishlistController } from "./wishlist.controller";
import { WishlistService } from "./wishlist.service";

describe("WishlistController", () => {
  let controller: WishlistController;
  const wishlistService = {
    add: jest.fn(),
    list: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WishlistController],
      providers: [{ provide: WishlistService, useValue: wishlistService }],
    }).compile();

    controller = module.get<WishlistController>(WishlistController);
  });

  it("add should forward customer id and product id", async () => {
    wishlistService.add.mockResolvedValue({ message: "Product added to wishlist" });

    const result = await controller.add(5, { productId: 7 });

    expect(wishlistService.add).toHaveBeenCalledWith(5, 7);
    expect(result.message).toContain("wishlist");
  });

  it("findAll should pass pagination", async () => {
    wishlistService.list.mockResolvedValue({ items: [], total: 0 });

    await controller.findAll(3, { page: 2, limit: 5 } as any);

    expect(wishlistService.list).toHaveBeenCalledWith(3, 2, 5);
  });

  it("findAll should default page and limit", async () => {
    wishlistService.list.mockResolvedValue({ items: [] });

    await controller.findAll(1, {} as any);

    expect(wishlistService.list).toHaveBeenCalledWith(1, 1, 10);
  });

  it("remove should forward ids", async () => {
    wishlistService.remove.mockResolvedValue({ message: "Removed from wishlist" });

    await controller.remove(4, 9);

    expect(wishlistService.remove).toHaveBeenCalledWith(4, 9);
  });
});
