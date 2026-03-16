import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { AdminOrdersController } from "./admin-orders.controller";
import { OrdersService } from "../product/orders/orders.service";
import { AdminUpdateOrderDto } from "./dto/admin.dto";
import { IS_PUBLIC_KEY } from "../auth/public.decorator";

const mockOrder = {
  id: 1,
  orderNumber: "ORD-111111",
  status: "pending",
  paymentStatus: "pending",
  totalAmount: "62",
  taxAmount: "3",
  shippingAmount: "40",
  trackingId: null,
  notes: null,
  createdAt: new Date("2026-03-01T10:00:00Z"),
  customer: {
    id: 1,
    name: "John Doe",
    email: "john@gmail.com",
    phone: "9876543210",
  },
  items: [],
  payments: [],
  shipments: [],
};

const mockOrdersService = {
  adminFindAll: jest.fn(),
  adminFindOne: jest.fn(),
  adminUpdate: jest.fn(),
  adminExportCsv: jest.fn(),
};

describe("AdminOrdersController", () => {
  let controller: AdminOrdersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminOrdersController],
      providers: [{ provide: OrdersService, useValue: mockOrdersService }],
    }).compile();

    controller = module.get<AdminOrdersController>(AdminOrdersController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ──────────────────────────────────────────────
  // GET /admin/orders
  // ──────────────────────────────────────────────
  describe("findAll()", () => {
    it("should return all orders with no filters", async () => {
      mockOrdersService.adminFindAll.mockResolvedValue([mockOrder]);

      const result = await controller.findAll();

      expect(mockOrdersService.adminFindAll).toHaveBeenCalledWith({
        status: undefined,
        paymentStatus: undefined,
        search: undefined,
        from: undefined,
        to: undefined,
      });
      expect(result).toEqual([mockOrder]);
    });

    it("should forward status and search filters", async () => {
      mockOrdersService.adminFindAll.mockResolvedValue([mockOrder]);

      await controller.findAll(
        "shipped",
        undefined,
        "john",
        "2026-01-01",
        "2026-03-31",
      );

      expect(mockOrdersService.adminFindAll).toHaveBeenCalledWith({
        status: "shipped",
        paymentStatus: undefined,
        search: "john",
        from: "2026-01-01",
        to: "2026-03-31",
      });
    });

    it("should filter by paymentStatus", async () => {
      mockOrdersService.adminFindAll.mockResolvedValue([mockOrder]);

      await controller.findAll(undefined, "paid");

      expect(mockOrdersService.adminFindAll).toHaveBeenCalledWith(
        expect.objectContaining({ paymentStatus: "paid" }),
      );
    });
  });

  // ──────────────────────────────────────────────
  // GET /admin/orders/:id
  // ──────────────────────────────────────────────
  describe("findOne()", () => {
    it("should return full order detail", async () => {
      mockOrdersService.adminFindOne.mockResolvedValue(mockOrder);

      const result = await controller.findOne(1);

      expect(mockOrdersService.adminFindOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockOrder);
    });

    it("should throw NotFoundException for unknown order", async () => {
      mockOrdersService.adminFindOne.mockRejectedValue(
        new NotFoundException("Order #99 not found"),
      );

      await expect(controller.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────
  // PUT /admin/orders/:id
  // ──────────────────────────────────────────────
  describe("update()", () => {
    it("should update order status and trackingId", async () => {
      const dto: AdminUpdateOrderDto = {
        status: "shipped",
        trackingId: "TRK-987654321",
      };
      const updated = { ...mockOrder, ...dto };
      mockOrdersService.adminUpdate.mockResolvedValue(updated);

      const result = await controller.update(1, dto);

      expect(mockOrdersService.adminUpdate).toHaveBeenCalledWith(1, dto);
      expect(result.status).toBe("shipped");
      expect(result.trackingId).toBe("TRK-987654321");
    });

    it("should throw NotFoundException when order not found", async () => {
      mockOrdersService.adminUpdate.mockRejectedValue(new NotFoundException());

      await expect(
        controller.update(99, { status: "cancelled" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────
  // GET /admin/orders/export
  // ──────────────────────────────────────────────
  describe("exportCsv()", () => {
    it("should set CSV headers and send file content", async () => {
      const csvContent =
        "Order Number,Customer Name,Customer Email,Customer Phone,Status,Payment Status,Total Amount,Tax Amount,Shipping Amount,Tracking ID,Notes,Created At\n" +
        'ORD-111111,"John Doe",john@gmail.com,9876543210,pending,pending,62,3,40,,,"2026-03-01T10:00:00.000Z"';
      mockOrdersService.adminExportCsv.mockResolvedValue(csvContent);

      const mockRes = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      await controller.exportCsv(
        mockRes as any,
        "pending",
        "2026-01-01",
        "2026-03-31",
      );

      expect(mockOrdersService.adminExportCsv).toHaveBeenCalledWith({
        status: "pending",
        from: "2026-01-01",
        to: "2026-03-31",
      });
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "text/csv",
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        expect.stringContaining('attachment; filename="orders-'),
      );
      expect(mockRes.send).toHaveBeenCalledWith(csvContent);
    });
  });

  // ──────────────────────────────────────────────
  // Authentication decorators
  // ──────────────────────────────────────────────
  describe("auth decorators", () => {
    it("should have @ApiBearerAuth() on the controller", () => {
      const metadata = Reflect.getMetadata(
        "swagger/apiSecurity",
        AdminOrdersController,
      );
      expect(metadata).toEqual([{ bearer: [] }]);
    });

    it("should NOT mark any route as @Public() — all require auth", () => {
      const methods = ["findAll", "findOne", "update", "exportCsv"];
      methods.forEach((method) => {
        const isPublic = Reflect.getMetadata(
          IS_PUBLIC_KEY,
          AdminOrdersController.prototype[method],
        );
        expect(isPublic).toBeUndefined();
      });
    });
  });
});
