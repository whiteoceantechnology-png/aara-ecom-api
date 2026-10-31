import { ForbiddenException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { CustomersService } from "../product/customers/customers.service";
import { IS_PUBLIC_KEY } from "./public.decorator";

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  updateUser: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
};

const mockCustomersService = {
  update: jest.fn(),
};

describe("AuthController", () => {
  // Denial tests exercise enforcing mode; report-only mode is covered in principal.spec.
  beforeEach(() => {
    process.env.AUTHZ_ENFORCE = "true";
  });
  afterEach(() => {
    delete process.env.AUTHZ_ENFORCE;
  });
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: CustomersService, useValue: mockCustomersService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  // ─── register ────────────────────────────────────────────────────────────────

  describe("register()", () => {
    it("should call authService.register and return the result", async () => {
      const dto = { username: "john_doe", password: "Secret@123" };
      const expected = { id: 1, username: "john_doe" };
      mockAuthService.register.mockResolvedValue(expected);

      const result = await controller.register(dto);

      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  // ─── login ────────────────────────────────────────────────────────────────────

  describe("login()", () => {
    it("should call authService.login and return the token", async () => {
      const dto = { username: "john_doe", password: "Secret@123" };
      const expected = { token: "mock.jwt.token" };
      mockAuthService.login.mockResolvedValue(expected);

      const result = await controller.login(dto);

      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  // ─── updateCustomer ───────────────────────────────────────────────────────────

  describe("updateCustomer()", () => {
    it("should call customersService.update with id and dto and return result", async () => {
      const dto = { name: "John Doe", gstIn: "789654123" };
      const expected = {
        id: 21,
        name: "John Doe",
        email: "john@gmail.com",
        phone: "9876543210",
        gstIn: "789654123",
        createdAt: new Date(),
      };
      mockCustomersService.update.mockResolvedValue(expected);

      const result = await controller.updateCustomer(21, dto, {
        customerId: 21,
      });

      expect(mockCustomersService.update).toHaveBeenCalledWith(21, dto);
      expect(result).toEqual(expected);
    });

    it("should forbid a customer from updating another customer", () => {
      expect(() =>
        controller.updateCustomer(22, { name: "x" } as never, {
          customerId: 21,
        }),
      ).toThrow(ForbiddenException);
    });
  });

  // ─── updateUser ───────────────────────────────────────────────────────────────

  describe("updateUser()", () => {
    it("should call authService.updateUser with id and dto and return result", async () => {
      const dto = { username: "new_username" };
      const expected = { id: 1, username: "new_username" };
      mockAuthService.updateUser.mockResolvedValue(expected);

      const result = await controller.updateUser(1, dto, { userId: 1 });

      expect(mockAuthService.updateUser).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(expected);
    });

    it("should forbid updating another user's account", async () => {
      await expect(
        controller.updateUser(2, { username: "x" }, { userId: 1 }),
      ).rejects.toThrow(ForbiddenException);
      expect(mockAuthService.updateUser).not.toHaveBeenCalled();
    });
  });

  // ─── forgotPassword ───────────────────────────────────────────────────────────

  describe("forgotPassword()", () => {
    it("should call authService.forgotPassword and return a message", async () => {
      const dto = { username: "john_doe" };
      const expected = {
        message: "Reset token generated. Use this token: abc123",
      };
      mockAuthService.forgotPassword.mockResolvedValue(expected);

      const result = await controller.forgotPassword(dto);

      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  // ─── resetPassword ────────────────────────────────────────────────────────────

  describe("resetPassword()", () => {
    it("should call authService.resetPassword and return a success message", async () => {
      const dto = { token: "valid-token", newPassword: "NewSecret@123" };
      const expected = { message: "Password has been reset successfully" };
      mockAuthService.resetPassword.mockResolvedValue(expected);

      const result = await controller.resetPassword(dto);

      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  // ──────────────────────────────────────────────
  // Authentication decorators
  // ──────────────────────────────────────────────
  describe("auth decorators", () => {
    it("should mark register as @Public()", () => {
      const isPublic = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        AuthController.prototype.register,
      );
      expect(isPublic).toBe(true);
    });

    it("should mark login as @Public()", () => {
      const isPublic = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        AuthController.prototype.login,
      );
      expect(isPublic).toBe(true);
    });

    it("should mark forgotPassword as @Public()", () => {
      const isPublic = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        AuthController.prototype.forgotPassword,
      );
      expect(isPublic).toBe(true);
    });

    it("should mark resetPassword as @Public()", () => {
      const isPublic = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        AuthController.prototype.resetPassword,
      );
      expect(isPublic).toBe(true);
    });

    it("should NOT mark updateUser as @Public() — requires auth", () => {
      const isPublic = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        AuthController.prototype.updateUser,
      );
      expect(isPublic).toBeUndefined();
    });
  });
});
