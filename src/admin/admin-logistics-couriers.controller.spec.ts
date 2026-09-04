import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AdminLogisticsCouriersController } from "./admin-logistics-couriers.controller";
import { AdminLogisticsCouriersService } from "./admin-logistics-couriers.service";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import {
  CourierIntegrationType,
  CourierStatus,
  CreateCourierDto,
} from "./dto/admin-courier.dto";

const mockCouriers = {
  list: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe("AdminLogisticsCouriersController", () => {
  let controller: AdminLogisticsCouriersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminLogisticsCouriersController],
      providers: [
        { provide: AdminLogisticsCouriersService, useValue: mockCouriers },
        AdminRoleGuard,
      ],
    }).compile();

    controller = module.get(AdminLogisticsCouriersController);
    jest.clearAllMocks();
  });

  it("lists couriers", async () => {
    mockCouriers.list.mockResolvedValue([]);
    await expect(controller.list()).resolves.toEqual([]);
  });

  it("creates a courier", async () => {
    const dto: CreateCourierDto = {
      name: "ST Courier",
      code: "ST",
      integrationType: CourierIntegrationType.MANUAL,
      status: CourierStatus.ACTIVE,
      states: [{ name: "Tamil Nadu", code: "TN" }],
      rateRules: [
        { minWeight: 0, maxWeight: 7, ratePerKg: 40, freeShipping: false },
      ],
    };
    mockCouriers.create.mockResolvedValue({
      message: "Courier created successfully",
      data: { id: 1, ...dto, states: [], rateRules: [] },
    });
    const result = await controller.create(dto);
    expect(mockCouriers.create).toHaveBeenCalledWith(dto);
    expect(result.message).toBe("Courier created successfully");
  });

  it("updates a courier", async () => {
    mockCouriers.update.mockResolvedValue({
      message: "Courier updated successfully",
      data: { id: 1 },
    });
    await expect(controller.update(1, { name: "ST" })).resolves.toEqual(
      expect.objectContaining({ message: "Courier updated successfully" }),
    );
  });

  it("deletes a courier", async () => {
    mockCouriers.remove.mockResolvedValue({
      message: "Courier deleted successfully",
    });
    await expect(controller.remove(1)).resolves.toEqual({
      message: "Courier deleted successfully",
    });
  });

  it("propagates not found", async () => {
    mockCouriers.findOne.mockRejectedValue(
      new NotFoundException("Courier #99 not found"),
    );
    await expect(controller.findOne(99)).rejects.toThrow(NotFoundException);
  });
});

describe("AdminLogisticsCouriersService", () => {
  it("rejects overlapping rate bands before DB write", async () => {
    const prisma = {
      courier: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
    };
    const svc = new AdminLogisticsCouriersService(prisma as never);
    await expect(
      svc.create({
        name: "X",
        code: "X",
        integrationType: CourierIntegrationType.MANUAL,
        rateRules: [
          { minWeight: 0, maxWeight: 7, ratePerKg: 40 },
          { minWeight: 6, maxWeight: 10, ratePerKg: 30 },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.courier.create).not.toHaveBeenCalled();
  });
});
