import { Test, TestingModule } from "@nestjs/testing";
import { AdminOrdersController } from "./admin-orders.controller";
import { AdminOrdersService } from "./admin-orders.service";
import { AdminUpdateOrderDto } from "./dto/admin.dto";
import { AdminRoleGuard } from "../auth/admin-role.guard";

const mockOrder = {
  id: 1,
  orderNumber: "ORD-111111",
  status: "PROCESSING",
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
  events: [],
  refunds: [],
};

const mockAdminOrders = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  exportExcel: jest.fn(),
  exportCsv: jest.fn(),
  listEvents: jest.fn(),
  recordPayment: jest.fn(),
  updatePaymentStatus: jest.fn(),
  requestRefund: jest.fn(),
  cancel: jest.fn(),
  contactCustomer: jest.fn(),
  autoDeliver: jest.fn(),
  getInventoryPolicy: jest.fn(),
  buildInvoiceHtml: jest.fn(),
  buildPackingSlipHtml: jest.fn(),
};

describe("AdminOrdersController", () => {
  let controller: AdminOrdersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminOrdersController],
      providers: [
        { provide: AdminOrdersService, useValue: mockAdminOrders },
        AdminRoleGuard,
      ],
    }).compile();

    controller = module.get<AdminOrdersController>(AdminOrdersController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("findAll()", () => {
    it("should return paginated orders", async () => {
      mockAdminOrders.findAll.mockResolvedValue({
        orders: [mockOrder],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const result = await controller.findAll();

      expect(mockAdminOrders.findAll).toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({ total: 1, orders: [mockOrder] }),
      );
    });
  });

  describe("findOne()", () => {
    it("should return order detail", async () => {
      mockAdminOrders.findOne.mockResolvedValue(mockOrder);
      await expect(controller.findOne(1)).resolves.toEqual(mockOrder);
    });
  });

  describe("update()", () => {
    it("should forward status update with actor", async () => {
      const dto: AdminUpdateOrderDto = { status: "PACKED" };
      mockAdminOrders.update.mockResolvedValue({
        ...mockOrder,
        status: "PACKED",
      });
      await controller.update(1, dto, { user: { username: "admin" } } as never);
      expect(mockAdminOrders.update).toHaveBeenCalledWith(1, dto, {
        name: "admin",
      });
    });
  });

  describe("inventoryPolicy()", () => {
    it("should return policy", () => {
      mockAdminOrders.getInventoryPolicy.mockReturnValue({ online: {} });
      expect(controller.inventoryPolicy()).toEqual({ online: {} });
    });
  });
});
