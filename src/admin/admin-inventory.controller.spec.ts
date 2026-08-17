import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { AdminInventoryController } from "./admin-inventory.controller";
import { AdminInventoryService } from "./admin-inventory.service";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import {
  AdminAdjustStockDto,
  AdminBulkStockUpdateDto,
  AdminReleaseStockDto,
  AdminReserveStockDto,
  AdminUpdateStockDto,
} from "./dto/admin.dto";

const mockInventory = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  updateStock: jest.fn(),
  adjustStock: jest.fn(),
  reserveStock: jest.fn(),
  releaseStock: jest.fn(),
  lowStock: jest.fn(),
  history: jest.fn(),
  bulkUpdate: jest.fn(),
};

const req = { user: { name: "Admin" } } as any;

describe("AdminInventoryController", () => {
  let controller: AdminInventoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminInventoryController],
      providers: [
        { provide: AdminInventoryService, useValue: mockInventory },
        AdminRoleGuard,
      ],
    }).compile();

    controller = module.get<AdminInventoryController>(AdminInventoryController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("findAll()", () => {
    it("should return paginated inventory", async () => {
      mockInventory.findAll.mockResolvedValue({
        inventory: [],
        total: 84,
        page: 1,
        limit: 25,
        totalPages: 4,
      });

      const result = await controller.findAll();
      expect(mockInventory.findAll).toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({ total: 84, totalPages: 4 }),
      );
    });
  });

  describe("findOne()", () => {
    it("should return stock details", async () => {
      const detail = {
        id: 45,
        productId: 12,
        productName: "Aloe Gel",
        variantName: "500ml",
        sku: "AAR-500",
        stockQuantity: 120,
        reservedQuantity: 15,
        availableQuantity: 105,
      };
      mockInventory.findOne.mockResolvedValue(detail);
      await expect(controller.findOne(45)).resolves.toEqual(detail);
    });

    it("should propagate not found", async () => {
      mockInventory.findOne.mockRejectedValue(
        new NotFoundException("Variant #99 not found"),
      );
      await expect(controller.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe("updateStock()", () => {
    it("should set absolute stock", async () => {
      const dto: AdminUpdateStockDto = { stockQuantity: 120 };
      mockInventory.updateStock.mockResolvedValue({
        id: 45,
        stockQuantity: 120,
        updatedAt: "2026-08-13T10:30:00Z",
      });
      const result = await controller.updateStock(45, dto, req);
      expect(mockInventory.updateStock).toHaveBeenCalledWith(45, dto, {
        name: "Admin",
      });
      expect(result.stockQuantity).toBe(120);
    });
  });

  describe("adjust()", () => {
    it("should adjust stock with reason", async () => {
      const dto: AdminAdjustStockDto = {
        quantityChange: -5,
        reason: "damaged",
        notes: "5 units damaged in transit",
      };
      mockInventory.adjustStock.mockResolvedValue({
        id: 45,
        stockQuantity: 115,
        adjustmentId: 901,
        updatedAt: "2026-08-13T10:30:00Z",
      });
      const result = await controller.adjust(45, dto, req);
      expect(result.adjustmentId).toBe(901);
    });
  });

  describe("reserve() / release()", () => {
    it("should reserve stock", async () => {
      const dto: AdminReserveStockDto = {
        quantity: 10,
        referenceType: "order",
        referenceId: 234,
      };
      mockInventory.reserveStock.mockResolvedValue({
        id: 45,
        reservedQuantity: 25,
        availableQuantity: 95,
      });
      await expect(controller.reserve(45, dto, req)).resolves.toEqual(
        expect.objectContaining({ reservedQuantity: 25 }),
      );
    });

    it("should release stock", async () => {
      const dto: AdminReleaseStockDto = {
        quantity: 10,
        referenceType: "order",
        referenceId: 234,
      };
      mockInventory.releaseStock.mockResolvedValue({
        id: 45,
        reservedQuantity: 15,
        availableQuantity: 105,
      });
      await expect(controller.release(45, dto, req)).resolves.toEqual(
        expect.objectContaining({ availableQuantity: 105 }),
      );
    });
  });

  describe("lowStock()", () => {
    it("should list low stock", async () => {
      mockInventory.lowStock.mockResolvedValue({
        inventory: [],
        total: 12,
        page: 1,
        limit: 25,
        totalPages: 1,
        threshold: 10,
      });
      const result = await controller.lowStock("10", "1", "25");
      expect(mockInventory.lowStock).toHaveBeenCalledWith({
        threshold: 10,
        page: 1,
        limit: 25,
      });
      expect(result.total).toBe(12);
    });
  });

  describe("history()", () => {
    it("should return movements", async () => {
      mockInventory.history.mockResolvedValue({
        movements: [],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      const result = await controller.history(45, "1", "20");
      expect(mockInventory.history).toHaveBeenCalledWith(45, {
        page: 1,
        limit: 20,
      });
      expect(result.total).toBe(2);
    });
  });

  describe("bulkUpdate()", () => {
    it("should bulk update stock", async () => {
      const dto: AdminBulkStockUpdateDto = {
        updates: [
          { variantId: 45, stockQuantity: 120 },
          { variantId: 46, stockQuantity: 0 },
        ],
      };
      mockInventory.bulkUpdate.mockResolvedValue({
        updated: 2,
        failed: 0,
        results: [],
      });
      const result = await controller.bulkUpdate(dto, req);
      expect(result.updated).toBe(2);
    });
  });
});
