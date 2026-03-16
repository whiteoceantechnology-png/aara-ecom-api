import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CustomersController } from "./customers.controller";
import { CustomersService } from "./customers.service";
import { CreateCustomerDto, CustomerLoginDto } from "../dto/customer.dto";
import { IS_PUBLIC_KEY } from "../../auth/public.decorator";

const mockCustomer = {
  id: 1,
  name: "John Doe",
  email: "john@gmail.com",
  phone: "9876543210",
  createdAt: new Date(),
  addresses: [],
};
const mockLoginResponse = {
  token: "jwt.token.here",
  customerId: 1,
  name: "John Doe",
};

const mockCustomersService = {
  register: jest.fn(),
  login: jest.fn(),
  findOne: jest.fn(),
};

describe("CustomersController", () => {
  let controller: CustomersController;
  let service: typeof mockCustomersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        { provide: CustomersService, useValue: mockCustomersService },
      ],
    }).compile();

    controller = module.get<CustomersController>(CustomersController);
    service = module.get(CustomersService);
    jest.clearAllMocks();
  });

  describe("register", () => {
    it("should register a customer and return profile", async () => {
      const dto: CreateCustomerDto = {
        name: "John Doe",
        email: "john@gmail.com",
        password: "Secret@123",
      };
      service.register.mockResolvedValue(mockCustomer);
      const result = await controller.register(dto);
      expect(result).toEqual(mockCustomer);
      expect(service.register).toHaveBeenCalledWith(dto);
    });

    it("should throw BadRequestException for duplicate email", async () => {
      service.register.mockRejectedValue(
        new BadRequestException("Email already registered"),
      );
      await expect(
        controller.register({
          name: "John",
          email: "john@gmail.com",
          password: "pass",
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("login", () => {
    it("should login and return a JWT token", async () => {
      const dto: CustomerLoginDto = {
        email: "john@gmail.com",
        password: "Secret@123",
      };
      service.login.mockResolvedValue(mockLoginResponse);
      const result = await controller.login(dto);
      expect(result).toEqual(mockLoginResponse);
      expect(result).toHaveProperty("token");
      expect(service.login).toHaveBeenCalledWith(dto);
    });

    it("should throw BadRequestException for invalid credentials", async () => {
      service.login.mockRejectedValue(
        new BadRequestException("Invalid credentials"),
      );
      await expect(
        controller.login({ email: "wrong@gmail.com", password: "wrong" }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("findOne", () => {
    it("should return customer profile", async () => {
      service.findOne.mockResolvedValue(mockCustomer);
      const result = await controller.findOne(1);
      expect(result).toEqual(mockCustomer);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });

    it("should throw NotFoundException when customer not found", async () => {
      service.findOne.mockRejectedValue(new NotFoundException());
      await expect(controller.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────
  // Authentication decorators
  // ──────────────────────────────────────────────
  describe("auth decorators", () => {
    it("should have @ApiBearerAuth() on the controller", () => {
      const metadata = Reflect.getMetadata(
        "swagger/apiSecurity",
        CustomersController,
      );
      expect(metadata).toEqual([{ bearer: [] }]);
    });

    it("should mark register as @Public()", () => {
      const isPublic = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        CustomersController.prototype.register,
      );
      expect(isPublic).toBe(true);
    });

    it("should mark login as @Public()", () => {
      const isPublic = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        CustomersController.prototype.login,
      );
      expect(isPublic).toBe(true);
    });

    it("should NOT mark findOne as @Public()", () => {
      const isPublic = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        CustomersController.prototype.findOne,
      );
      expect(isPublic).toBeUndefined();
    });
  });
});
