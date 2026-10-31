import { ForbiddenException } from "@nestjs/common";
import { assertSelfOrAdmin, isAdminPrincipal } from "./principal";
import { StorefrontAdminGuard } from "./storefront-admin.guard";

describe("principal", () => {
  describe("isAdminPrincipal", () => {
    it("accepts admin and superadmin roles", () => {
      expect(isAdminPrincipal({ role: "admin" })).toBe(true);
      expect(isAdminPrincipal({ role: "superadmin" })).toBe(true);
    });

    it("accepts legacy sub + username admin tokens", () => {
      expect(isAdminPrincipal({ sub: 1, username: "root" })).toBe(true);
    });

    it("rejects customer, store-user and empty tokens", () => {
      expect(isAdminPrincipal({ customerId: 1 })).toBe(false);
      expect(isAdminPrincipal({ userId: 1 })).toBe(false);
      expect(
        isAdminPrincipal({ sub: 1, username: "root", customerId: 1 }),
      ).toBe(false);
      expect(isAdminPrincipal({})).toBe(false);
      expect(isAdminPrincipal(undefined)).toBe(false);
    });
  });

  describe("assertSelfOrAdmin (report-only default)", () => {
    beforeEach(() => {
      delete process.env.AUTHZ_ENFORCE;
    });

    it("allows mismatched owners exactly as before when not enforcing", () => {
      expect(() =>
        assertSelfOrAdmin({ customerId: 5 }, "customerId", 6),
      ).not.toThrow();
      expect(() => assertSelfOrAdmin({}, "customerId", 5)).not.toThrow();
    });
  });

  describe("StorefrontAdminGuard", () => {
    const ctx = (user: unknown) =>
      ({
        switchToHttp: () => ({
          getRequest: () => ({
            user,
            method: "POST",
            originalUrl: "/products",
          }),
        }),
      }) as never;

    afterEach(() => {
      delete process.env.AUTHZ_ENFORCE;
    });

    it("lets non-admins through in report-only mode (existing behaviour)", () => {
      expect(
        new StorefrontAdminGuard().canActivate(ctx({ customerId: 1 })),
      ).toBe(true);
    });

    it("blocks non-admins when AUTHZ_ENFORCE=true", () => {
      process.env.AUTHZ_ENFORCE = "true";
      expect(() =>
        new StorefrontAdminGuard().canActivate(ctx({ customerId: 1 })),
      ).toThrow(ForbiddenException);
    });

    it("always allows admins", () => {
      process.env.AUTHZ_ENFORCE = "true";
      expect(
        new StorefrontAdminGuard().canActivate(ctx({ role: "admin" })),
      ).toBe(true);
    });
  });

  describe("assertSelfOrAdmin", () => {
    beforeEach(() => {
      process.env.AUTHZ_ENFORCE = "true";
    });
    afterEach(() => {
      delete process.env.AUTHZ_ENFORCE;
    });

    it("allows the owner", () => {
      expect(() =>
        assertSelfOrAdmin({ customerId: 5 }, "customerId", 5),
      ).not.toThrow();
      expect(() =>
        assertSelfOrAdmin({ userId: "7" }, "userId", 7),
      ).not.toThrow();
    });

    it("allows admins for any owner", () => {
      expect(() =>
        assertSelfOrAdmin({ role: "admin" }, "customerId", 99),
      ).not.toThrow();
    });

    it("forbids other customers, wrong claim types and missing owners", () => {
      expect(() =>
        assertSelfOrAdmin({ customerId: 5 }, "customerId", 6),
      ).toThrow(ForbiddenException);
      // a userId token must not satisfy a customerId check
      expect(() => assertSelfOrAdmin({ userId: 5 }, "customerId", 5)).toThrow(
        ForbiddenException,
      );
      expect(() =>
        assertSelfOrAdmin({ customerId: 5 }, "customerId", null),
      ).toThrow(ForbiddenException);
      expect(() => assertSelfOrAdmin({}, "customerId", 5)).toThrow(
        ForbiddenException,
      );
    });
  });
});
