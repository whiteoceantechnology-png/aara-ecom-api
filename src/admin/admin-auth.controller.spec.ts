import { Test, TestingModule } from "@nestjs/testing";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { AdminAuthController } from "./admin-auth.controller";
import { AdminAuthService } from "./admin-auth.service";
import { AdminLoginDto, CreateAdminDto } from "./dto/admin-auth.dto";

const mockAdminAuthService = {
  register: jest.fn(),
  login: jest.fn(),
};

describe("AdminAuthController", () => {
  let controller: AdminAuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAuthController],
      providers: [
        { provide: AdminAuthService, useValue: mockAdminAuthService },
      ],
    }).compile();

    controller = module.get<AdminAuthController>(AdminAuthController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ──────────────────────────────────────────────
  // POST /admin/auth/register
  // ──────────────────────────────────────────────
  describe("register()", () => {
    it("should register a new admin and return the admin record", async () => {
      const dto: CreateAdminDto = { username: "admin", password: "Admin@123" };
      const admin = {
        id: 1,
        username: "admin",
        role: "admin",
        createdAt: new Date(),
      };
      mockAdminAuthService.register.mockResolvedValue(admin);

      const result = await controller.register(dto);

      expect(mockAdminAuthService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(admin);
    });

    it("should throw ConflictException when username is taken", async () => {
      mockAdminAuthService.register.mockRejectedValue(
        new ConflictException("Admin username already exists"),
      );

      await expect(
        controller.register({ username: "admin", password: "Admin@123" }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ──────────────────────────────────────────────
  // POST /admin/auth/login
  // ──────────────────────────────────────────────
  describe("login()", () => {
    it("should return a JWT token and admin info on valid credentials", async () => {
      const dto: AdminLoginDto = { username: "admin", password: "Admin@123" };
      const response = {
        token: "eyJhbGciOiJIUzI1NiJ9.test.signature",
        admin: { id: 1, username: "admin", role: "admin" },
      };
      mockAdminAuthService.login.mockResolvedValue(response);

      const result = await controller.login(dto);

      expect(mockAdminAuthService.login).toHaveBeenCalledWith(dto);
      expect(result.token).toBeDefined();
      expect(result.admin.username).toBe("admin");
    });

    it("should throw UnauthorizedException for invalid credentials", async () => {
      mockAdminAuthService.login.mockRejectedValue(
        new UnauthorizedException("Invalid credentials"),
      );

      await expect(
        controller.login({ username: "admin", password: "wrong" }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
