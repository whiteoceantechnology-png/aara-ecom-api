import { Test, TestingModule } from "@nestjs/testing";
import {
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { UserRepository } from "./user.repository";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";

jest.mock("bcrypt");
jest.mock("jsonwebtoken");
jest.mock("crypto", () => ({
  randomBytes: jest.fn(() => ({ toString: () => "mock-reset-token-hex" })),
}));

const mockUserRepository = {
  findByUsername: jest.fn(),
  findById: jest.fn(),
  findByResetToken: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  setResetToken: jest.fn(),
  clearResetToken: jest.fn(),
};

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepository, useValue: mockUserRepository },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ─── register ────────────────────────────────────────────────────────────────

  describe("register()", () => {
    const dto = { username: "john_doe", password: "Secret@123" };

    it("should register a new user and return id and username", async () => {
      mockUserRepository.findByUsername.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed_password");
      mockUserRepository.createUser.mockResolvedValue({
        id: 1,
        username: "john_doe",
      });

      const result = await service.register(dto);

      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith(
        "john_doe",
      );
      expect(bcrypt.hash).toHaveBeenCalledWith("Secret@123", 10);
      expect(mockUserRepository.createUser).toHaveBeenCalledWith(
        "john_doe",
        "hashed_password",
        undefined,
      );
      expect(result).toEqual({ id: 1, username: "john_doe" });
    });

    it("should throw ConflictException if username already exists", async () => {
      mockUserRepository.findByUsername.mockResolvedValue({
        id: 1,
        username: "john_doe",
      });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(mockUserRepository.createUser).not.toHaveBeenCalled();
    });
  });

  // ─── login ────────────────────────────────────────────────────────────────────

  describe("login()", () => {
    const dto = { username: "john_doe", password: "Secret@123" };
    const mockUser = {
      id: 1,
      username: "john_doe",
      password: "hashed_password",
    };

    it("should return a JWT token on successful login", async () => {
      mockUserRepository.findByUsername.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue("mock.jwt.token");
      process.env.JWT_SECRET = "test_secret";

      const result = await service.login(dto);

      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith(
        "john_doe",
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(
        "Secret@123",
        "hashed_password",
      );
      expect(jwt.sign).toHaveBeenCalledWith({ userId: 1 }, "test_secret", {
        expiresIn: "1h",
      });
      expect(result).toEqual({ token: "mock.jwt.token" });
    });

    it("should throw UnauthorizedException if user does not exist", async () => {
      mockUserRepository.findByUsername.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it("should throw UnauthorizedException if password is invalid", async () => {
      mockUserRepository.findByUsername.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(jwt.sign).not.toHaveBeenCalled();
    });
  });

  // ─── updateUser ───────────────────────────────────────────────────────────────

  describe("updateUser()", () => {
    const mockUser = {
      id: 1,
      username: "john_doe",
      password: "hashed_password",
    };

    it("should update username successfully", async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.updateUser.mockResolvedValue({
        id: 1,
        username: "new_username",
      });

      const result = await service.updateUser(1, { username: "new_username" });

      expect(mockUserRepository.findById).toHaveBeenCalledWith(1);
      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith(
        "new_username",
      );
      expect(mockUserRepository.updateUser).toHaveBeenCalledWith(1, {
        username: "new_username",
      });
      expect(result).toEqual({ id: 1, username: "new_username" });
    });

    it("should update password successfully", async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue("new_hashed_password");
      mockUserRepository.updateUser.mockResolvedValue({
        id: 1,
        username: "john_doe",
      });

      const result = await service.updateUser(1, { password: "NewSecret@123" });

      expect(bcrypt.hash).toHaveBeenCalledWith("NewSecret@123", 10);
      expect(mockUserRepository.updateUser).toHaveBeenCalledWith(1, {
        password: "new_hashed_password",
      });
      expect(result).toEqual({ id: 1, username: "john_doe" });
    });

    it("should throw NotFoundException if user does not exist", async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateUser(99, { username: "new_name" }),
      ).rejects.toThrow(NotFoundException);
      expect(mockUserRepository.updateUser).not.toHaveBeenCalled();
    });

    it("should throw ConflictException if new username is already taken", async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.findByUsername.mockResolvedValue({
        id: 2,
        username: "taken_name",
      });

      await expect(
        service.updateUser(1, { username: "taken_name" }),
      ).rejects.toThrow(ConflictException);
      expect(mockUserRepository.updateUser).not.toHaveBeenCalled();
    });

    it("should not update username if it is the same as current username", async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updateUser.mockResolvedValue({
        id: 1,
        username: "john_doe",
      });

      await service.updateUser(1, { username: "john_doe" });

      // findByUsername should NOT be called since username is unchanged
      expect(mockUserRepository.findByUsername).not.toHaveBeenCalled();
    });
  });

  // ─── forgotPassword ───────────────────────────────────────────────────────────

  describe("forgotPassword()", () => {
    const dto = { username: "john_doe" };
    const mockUser = { id: 1, username: "john_doe", password: "hashed" };

    it("should generate a reset token for an existing user", async () => {
      mockUserRepository.findByUsername.mockResolvedValue(mockUser);
      mockUserRepository.setResetToken.mockResolvedValue(undefined);

      const result = await service.forgotPassword(dto);

      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith(
        "john_doe",
      );
      expect(mockUserRepository.setResetToken).toHaveBeenCalledWith(
        1,
        "mock-reset-token-hex",
        expect.any(Date),
      );
      expect(result.message).toContain("mock-reset-token-hex");
    });

    it("should return a generic message if user does not exist (prevent enumeration)", async () => {
      mockUserRepository.findByUsername.mockResolvedValue(null);

      const result = await service.forgotPassword(dto);

      expect(mockUserRepository.setResetToken).not.toHaveBeenCalled();
      expect(result.message).toContain("If the username exists");
    });
  });

  // ─── resetPassword ────────────────────────────────────────────────────────────

  describe("resetPassword()", () => {
    const dto = { token: "valid-token", newPassword: "NewSecret@123" };
    const futureExpiry = new Date(Date.now() + 60 * 60 * 1000);
    const mockUser = {
      id: 1,
      username: "john_doe",
      password: "old_hashed",
      resetToken: "valid-token",
      resetTokenExpiry: futureExpiry,
    };

    it("should reset password successfully with a valid token", async () => {
      mockUserRepository.findByResetToken.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue("new_hashed_password");
      mockUserRepository.updateUser.mockResolvedValue(undefined);
      mockUserRepository.clearResetToken.mockResolvedValue(undefined);

      const result = await service.resetPassword(dto);

      expect(mockUserRepository.findByResetToken).toHaveBeenCalledWith(
        "valid-token",
      );
      expect(bcrypt.hash).toHaveBeenCalledWith("NewSecret@123", 10);
      expect(mockUserRepository.updateUser).toHaveBeenCalledWith(1, {
        password: "new_hashed_password",
      });
      expect(mockUserRepository.clearResetToken).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        message: "Password has been reset successfully",
      });
    });

    it("should throw BadRequestException if token is invalid", async () => {
      mockUserRepository.findByResetToken.mockResolvedValue(null);

      await expect(service.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUserRepository.updateUser).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException if token is expired", async () => {
      const expiredUser = {
        ...mockUser,
        resetTokenExpiry: new Date(Date.now() - 1000),
      };
      mockUserRepository.findByResetToken.mockResolvedValue(expiredUser);

      await expect(service.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUserRepository.updateUser).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException if resetTokenExpiry is null", async () => {
      const noExpiryUser = { ...mockUser, resetTokenExpiry: null };
      mockUserRepository.findByResetToken.mockResolvedValue(noExpiryUser);

      await expect(service.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
