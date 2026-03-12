import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { AdminCustomersController } from "./admin-customers.controller";
import { AdminCustomersService } from "./admin-customers.service";
import { AdminCustomerFilterDto } from "./dto/admin.dto";

const mockCustomer = {
  id: 1,
  name: "John Doe",
  email: "john@gmail.com",
  phone: "9876543210",
  isBlocked: false,
  createdAt: new Date("2026-01-15T00:00:00Z"),
  _count: { orders: 3 },
};

const mockCustomerDetail = {
  ...mockCustomer,
  addresses: [],
  orders: [
    {
      id: 1,
      orderNumber: "ORD-111",
      status: "delivered",
      totalAmount: "62",
      paymentStatus: "paid",
      createdAt: new Date(),
    },
  ],
  totalSpent: 62,
  lastOrderDate: new Date(),
};

const mockAdminCustomersService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  toggleBlock: jest.fn(),
};

describe("AdminCustomersController", () => {
  let controller: AdminCustomersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminCustomersController],
      providers: [
        { provide: AdminCustomersService, useValue: mockAdminCustomersService },
      ],
    }).compile();

    controller = module.get<AdminCustomersController>(AdminCustomersController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ──────────────────────────────────────────────
  // GET /admin/customers
  // ──────────────────────────────────────────────
  describe("findAll()", () => {
    it("should return list of all customers", async () => {
      mockAdminCustomersService.findAll.mockResolvedValue([mockCustomer]);

      const filter: AdminCustomerFilterDto = {};
      const result = await controller.findAll(filter);

      expect(mockAdminCustomersService.findAll).toHaveBeenCalledWith(filter);
      expect(result).toEqual([mockCustomer]);
    });

    it("should filter blocked customers", async () => {
      const blocked = { ...mockCustomer, isBlocked: true };
      mockAdminCustomersService.findAll.mockResolvedValue([blocked]);

      const filter: AdminCustomerFilterDto = { isBlocked: true };
      const result = await controller.findAll(filter);

      expect(mockAdminCustomersService.findAll).toHaveBeenCalledWith(filter);
      expect(result[0].isBlocked).toBe(true);
    });

    it("should search customers by name", async () => {
      mockAdminCustomersService.findAll.mockResolvedValue([mockCustomer]);

      const filter: AdminCustomerFilterDto = { search: "john" };
      await controller.findAll(filter);

      expect(mockAdminCustomersService.findAll).toHaveBeenCalledWith(filter);
    });
  });

  // ──────────────────────────────────────────────
  // GET /admin/customers/:id
  // ──────────────────────────────────────────────
  describe("findOne()", () => {
    it("should return customer detail with order history and total spent", async () => {
      mockAdminCustomersService.findOne.mockResolvedValue(mockCustomerDetail);

      const result = await controller.findOne(1);

      expect(mockAdminCustomersService.findOne).toHaveBeenCalledWith(1);
      expect(result.totalSpent).toBe(62);
      expect(result.orders).toHaveLength(1);
    });

    it("should throw NotFoundException for unknown customer", async () => {
      mockAdminCustomersService.findOne.mockRejectedValue(
        new NotFoundException("Customer #99 not found"),
      );

      await expect(controller.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────
  // PATCH /admin/customers/:id/toggle-block
  // ──────────────────────────────────────────────
  describe("toggleBlock()", () => {
    it("should block an active customer and return updated record", async () => {
      const blocked = {
        id: 1,
        name: "John Doe",
        email: "john@gmail.com",
        isBlocked: true,
        message: "Customer blocked",
      };
      mockAdminCustomersService.toggleBlock.mockResolvedValue(blocked);

      const result = await controller.toggleBlock(1);

      expect(mockAdminCustomersService.toggleBlock).toHaveBeenCalledWith(1);
      expect(result.isBlocked).toBe(true);
      expect(result.message).toBe("Customer blocked");
    });

    it("should unblock a blocked customer", async () => {
      const unblocked = {
        id: 1,
        name: "John Doe",
        email: "john@gmail.com",
        isBlocked: false,
        message: "Customer unblocked",
      };
      mockAdminCustomersService.toggleBlock.mockResolvedValue(unblocked);

      const result = await controller.toggleBlock(1);

      expect(result.isBlocked).toBe(false);
      expect(result.message).toBe("Customer unblocked");
    });

    it("should throw NotFoundException for unknown customer", async () => {
      mockAdminCustomersService.toggleBlock.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(controller.toggleBlock(99)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
