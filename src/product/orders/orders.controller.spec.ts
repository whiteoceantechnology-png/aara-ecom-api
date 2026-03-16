import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { IS_PUBLIC_KEY } from "../../auth/public.decorator";

const mockOrdersService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  updateStatus: jest.fn(),
};

describe("OrdersController", () => {
  let controller: OrdersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: mockOrdersService }],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ──────────────────────────────────────────────
  // POST /orders
  // ──────────────────────────────────────────────
  describe("create()", () => {
    it("should create an order from a cart", async () => {
      const dto = { customerId: 1, cartId: 2 };
      const order = { id: 10, orderNumber: "ORD-123456", status: "pending" };
      mockOrdersService.create.mockResolvedValue(order);

      const result = await controller.create(dto as any);

      expect(mockOrdersService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(order);
    });

    it("should throw BadRequestException when cart is empty", async () => {
      mockOrdersService.create.mockRejectedValue(
        new BadRequestException("Cart is empty"),
      );

      await expect(
        controller.create({ customerId: 1, cartId: 99 } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ──────────────────────────────────────────────
  // GET /orders
  // ──────────────────────────────────────────────
  describe("findAll()", () => {
    it("should return all orders when no customerId provided", async () => {
      const orders = [{ id: 1 }, { id: 2 }];
      mockOrdersService.findAll.mockResolvedValue(orders);

      const result = await controller.findAll(undefined);

      expect(mockOrdersService.findAll).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(orders);
    });

    it("should return orders filtered by customerId", async () => {
      const orders = [{ id: 1, customerId: 5 }];
      mockOrdersService.findAll.mockResolvedValue(orders);

      const result = await controller.findAll("5");

      expect(mockOrdersService.findAll).toHaveBeenCalledWith(5);
      expect(result).toEqual(orders);
    });
  });

  // ──────────────────────────────────────────────
  // GET /orders/:id
  // ──────────────────────────────────────────────
  describe("findOne()", () => {
    it("should return an order by ID", async () => {
      const order = { id: 1, orderNumber: "ORD-111", items: [] };
      mockOrdersService.findOne.mockResolvedValue(order);

      const result = await controller.findOne(1);

      expect(mockOrdersService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(order);
    });

    it("should throw NotFoundException for a non-existent order", async () => {
      mockOrdersService.findOne.mockRejectedValue(
        new NotFoundException("Order not found"),
      );

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────
  // PUT /orders/:id/status
  // ──────────────────────────────────────────────
  describe("updateStatus()", () => {
    it("should update the order status", async () => {
      const updated = { id: 1, status: "shipped" };
      mockOrdersService.updateStatus.mockResolvedValue(updated);

      const result = await controller.updateStatus(1, {
        status: "shipped",
      } as any);

      expect(mockOrdersService.updateStatus).toHaveBeenCalledWith(1, "shipped");
      expect(result).toEqual(updated);
    });

    it("should throw NotFoundException when order does not exist", async () => {
      mockOrdersService.updateStatus.mockRejectedValue(
        new NotFoundException("Order not found"),
      );

      await expect(
        controller.updateStatus(999, { status: "shipped" } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────
  // Authentication decorators
  // ──────────────────────────────────────────────
  describe("auth decorators", () => {
    it("should have @ApiBearerAuth() on the controller", () => {
      const metadata = Reflect.getMetadata(
        "swagger/apiSecurity",
        OrdersController,
      );
      expect(metadata).toEqual([{ bearer: [] }]);
    });

    it("should NOT mark create as @Public()", () => {
      const isPublic = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        OrdersController.prototype.create,
      );
      expect(isPublic).toBeUndefined();
    });

    it("should NOT mark findAll as @Public()", () => {
      const isPublic = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        OrdersController.prototype.findAll,
      );
      expect(isPublic).toBeUndefined();
    });

    it("should NOT mark findOne as @Public()", () => {
      const isPublic = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        OrdersController.prototype.findOne,
      );
      expect(isPublic).toBeUndefined();
    });

    it("should NOT mark updateStatus as @Public()", () => {
      const isPublic = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        OrdersController.prototype.updateStatus,
      );
      expect(isPublic).toBeUndefined();
    });
  });
});
