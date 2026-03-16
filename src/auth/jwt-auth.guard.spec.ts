import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtAuthGuard } from "./jwt-auth.guard";
import * as jwt from "jsonwebtoken";

jest.mock("jsonwebtoken");

describe("JwtAuthGuard", () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  const createMockContext = (
    headers: Record<string, string | undefined> = {},
  ): ExecutionContext => {
    const request = { headers, user: undefined };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
  });

  // ──────────────────────────────────────────────
  // Public routes
  // ──────────────────────────────────────────────
  describe("public routes (@Public)", () => {
    it("should allow access without token when route is marked @Public()", () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);
      const ctx = createMockContext();

      expect(guard.canActivate(ctx)).toBe(true);
    });

    it("should allow access even with an invalid token on @Public() routes", () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);
      const ctx = createMockContext({
        authorization: "Bearer invalid-token",
      });

      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  // ──────────────────────────────────────────────
  // Protected routes — missing / invalid token
  // ──────────────────────────────────────────────
  describe("protected routes (no @Public)", () => {
    beforeEach(() => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(false);
    });

    it("should throw UnauthorizedException when no Authorization header", () => {
      const ctx = createMockContext();

      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException when header does not start with Bearer", () => {
      const ctx = createMockContext({ authorization: "Basic abc123" });

      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException when token is empty after Bearer", () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error("jwt must be provided");
      });
      const ctx = createMockContext({ authorization: "Bearer " });

      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException when token is invalid/expired", () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error("jwt expired");
      });
      const ctx = createMockContext({
        authorization: "Bearer expired.token.here",
      });

      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it("should allow access and set request.user when token is valid", () => {
      const payload = { userId: 1, iat: 123, exp: 999 };
      (jwt.verify as jest.Mock).mockReturnValue(payload);
      const ctx = createMockContext({
        authorization: "Bearer valid.jwt.token",
      });

      expect(guard.canActivate(ctx)).toBe(true);

      const request = ctx.switchToHttp().getRequest();
      expect(request.user).toEqual(payload);
    });

    it("should call jwt.verify with the correct secret and token", () => {
      const payload = { userId: 1 };
      (jwt.verify as jest.Mock).mockReturnValue(payload);
      const ctx = createMockContext({
        authorization: "Bearer my.jwt.token",
      });

      guard.canActivate(ctx);

      expect(jwt.verify).toHaveBeenCalledWith("my.jwt.token", "test-secret");
    });

    it("should use fallback secret when JWT_SECRET env is undefined", () => {
      delete process.env.JWT_SECRET;
      const payload = { userId: 1 };
      (jwt.verify as jest.Mock).mockReturnValue(payload);
      const ctx = createMockContext({
        authorization: "Bearer my.jwt.token",
      });

      guard.canActivate(ctx);

      expect(jwt.verify).toHaveBeenCalledWith("my.jwt.token", "secret");
    });
  });
});
