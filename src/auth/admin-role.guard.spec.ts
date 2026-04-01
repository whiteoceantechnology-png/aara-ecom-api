import { ForbiddenException } from "@nestjs/common";
import { AdminRoleGuard } from "./admin-role.guard";

describe("AdminRoleGuard", () => {
  const guard = new AdminRoleGuard();

  function ctx(user: { role?: string } | undefined) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    };
  }

  it("allows admin role", () => {
    expect(guard.canActivate(ctx({ role: "admin" }) as never)).toBe(true);
  });

  it("allows superadmin role", () => {
    expect(guard.canActivate(ctx({ role: "superadmin" }) as never)).toBe(true);
  });

  it("rejects missing user payload", () => {
    expect(() => guard.canActivate(ctx(undefined) as never)).toThrow(
      ForbiddenException,
    );
  });

  it("rejects app-user JWT (userId, no role)", () => {
    expect(() =>
      guard.canActivate(ctx({} as { role?: string }) as never),
    ).toThrow(ForbiddenException);
  });

  it("rejects unknown role", () => {
    expect(() => guard.canActivate(ctx({ role: "user" }) as never)).toThrow(
      ForbiddenException,
    );
  });
});
