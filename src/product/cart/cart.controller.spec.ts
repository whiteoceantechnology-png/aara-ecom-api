import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { CartController } from "./cart.controller";
import { CartService } from "./cart.service";
import { AddToCartDto, UpdateCartItemDto } from "../dto/cart.dto";

const mockCart = { id: 1, customerId: 1, createdAt: new Date(), items: [] };
const mockCartItem = {
  id: 1,
  cartId: 1,
  variantId: 1,
  productId: 1,
  quantity: 2,
  price: "31",
};

const mockCartService = {
  getOrCreate: jest.fn(),
  addItem: jest.fn(),
  updateItem: jest.fn(),
  removeItem: jest.fn(),
};

describe("CartController", () => {
  let controller: CartController;
  let service: typeof mockCartService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [{ provide: CartService, useValue: mockCartService }],
    }).compile();

    controller = module.get<CartController>(CartController);
    service = module.get(CartService);
    jest.clearAllMocks();
  });

  describe("getCart", () => {
    it("should return the cart for a customer", async () => {
      service.getOrCreate.mockResolvedValue(mockCart);
      const result = await controller.getCart(1);
      expect(result).toEqual(mockCart);
      expect(service.getOrCreate).toHaveBeenCalledWith(1);
    });
  });

  describe("addItem", () => {
    it("should add an item to the cart", async () => {
      const dto: AddToCartDto = { customerId: 1, variantId: 1, quantity: 2 };
      service.addItem.mockResolvedValue(mockCartItem);
      const result = await controller.addItem(dto);
      expect(result).toEqual(mockCartItem);
      expect(service.addItem).toHaveBeenCalledWith(dto);
    });

    it("should throw NotFoundException when variant not found", async () => {
      service.addItem.mockRejectedValue(new NotFoundException());
      await expect(
        controller.addItem({ customerId: 1, variantId: 99, quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("updateItem", () => {
    it("should update the cart item quantity", async () => {
      const dto: UpdateCartItemDto = { cartItemId: 1, quantity: 3 };
      service.updateItem.mockResolvedValue({ ...mockCartItem, quantity: 3 });
      const result = await controller.updateItem(dto);
      expect(result.quantity).toBe(3);
      expect(service.updateItem).toHaveBeenCalledWith(dto);
    });

    it("should remove item when quantity is 0", async () => {
      const dto: UpdateCartItemDto = { cartItemId: 1, quantity: 0 };
      service.updateItem.mockResolvedValue({ message: "Cart item removed" });
      const result = await controller.updateItem(dto);
      expect(result).toEqual({ message: "Cart item removed" });
    });

    it("should throw NotFoundException when cart item not found", async () => {
      service.updateItem.mockRejectedValue(new NotFoundException());
      await expect(
        controller.updateItem({ cartItemId: 99, quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("removeItem", () => {
    it("should remove a cart item", async () => {
      service.removeItem.mockResolvedValue({
        message: "Item removed from cart",
      });
      const result = await controller.removeItem(1);
      expect(result).toEqual({ message: "Item removed from cart" });
      expect(service.removeItem).toHaveBeenCalledWith(1);
    });

    it("should throw NotFoundException when cart item not found", async () => {
      service.removeItem.mockRejectedValue(new NotFoundException());
      await expect(controller.removeItem(99)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
