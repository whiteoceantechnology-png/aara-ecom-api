import { Test, TestingModule } from "@nestjs/testing";
import { AdminDashboardController } from "./admin-dashboard.controller";
import { AdminDashboardService } from "./admin-dashboard.service";

const mockSummary = {
  summary: {
    totalOrders: 42,
    totalCustomers: 18,
    totalProducts: 12,
    pendingOrders: 5,
    totalRevenue: "4826.50",
  },
  ordersByStatus: [
    { status: "pending", count: 5 },
    { status: "shipped", count: 15 },
    { status: "delivered", count: 22 },
  ],
  recentOrders: [],
  topProducts: [],
};

const mockSalesReport = [
  { date: "2026-03-01", orders: 4, revenue: "248.00" },
  { date: "2026-03-02", orders: 6, revenue: "372.50" },
];

const mockAdminDashboardService = {
  getSummary: jest.fn(),
  getSalesReport: jest.fn(),
};

describe("AdminDashboardController", () => {
  let controller: AdminDashboardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminDashboardController],
      providers: [
        { provide: AdminDashboardService, useValue: mockAdminDashboardService },
      ],
    }).compile();

    controller = module.get<AdminDashboardController>(AdminDashboardController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ──────────────────────────────────────────────
  // GET /admin/dashboard
  // ──────────────────────────────────────────────
  describe("getSummary()", () => {
    it("should return dashboard summary with all stats", async () => {
      mockAdminDashboardService.getSummary.mockResolvedValue(mockSummary);

      const result = await controller.getSummary();

      expect(mockAdminDashboardService.getSummary).toHaveBeenCalledTimes(1);
      expect(result.summary.totalOrders).toBe(42);
      expect(result.ordersByStatus).toHaveLength(3);
    });
  });

  // ──────────────────────────────────────────────
  // GET /admin/dashboard/sales
  // ──────────────────────────────────────────────
  describe("getSalesReport()", () => {
    it("should return daily sales report with default 30 days", async () => {
      mockAdminDashboardService.getSalesReport.mockResolvedValue(
        mockSalesReport,
      );

      const result = await controller.getSalesReport(undefined);

      expect(mockAdminDashboardService.getSalesReport).toHaveBeenCalledWith(30);
      expect(result).toEqual(mockSalesReport);
    });

    it("should pass parsed days value to service", async () => {
      mockAdminDashboardService.getSalesReport.mockResolvedValue(
        mockSalesReport,
      );

      await controller.getSalesReport("7");

      expect(mockAdminDashboardService.getSalesReport).toHaveBeenCalledWith(7);
    });

    it("should return per-day sales breakdown", async () => {
      mockAdminDashboardService.getSalesReport.mockResolvedValue(
        mockSalesReport,
      );

      const result = await controller.getSalesReport("30");

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("date");
      expect(result[0]).toHaveProperty("revenue");
    });
  });
});
