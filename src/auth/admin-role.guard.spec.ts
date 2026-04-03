import { ForbiddenException } from "@nestjs/common";
import { AdminRoleGuard } from "./admin-role.guard";

describe("AdminRoleGuard", () => {
  const guard = new AdminRoleGuard();

  function ctx(user: unknown) {
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

  it("allows legacy admin payload (sub + username, no role)", () => {
    expect(guard.canActivate(ctx({ sub: 1, username: "admin" }) as never)).toBe(
      true,
    );
  });

  it("rejects missing user payload", () => {
    expect(() => guard.canActivate(ctx(undefined) as never)).toThrow(
      ForbiddenException,
    );
  });

  it("rejects store user JWT (userId)", () => {
    expect(() => guard.canActivate(ctx({ userId: 1 }) as never)).toThrow(
      /POST \/auth\/login/,
    );
  });

  it("rejects customer JWT (customerId)", () => {
    expect(() => guard.canActivate(ctx({ customerId: 2 }) as never)).toThrow(
      /POST \/customers\/login/,
    );
  });

  it("rejects unknown role without admin shape", () => {
    expect(() => guard.canActivate(ctx({ role: "user" }) as never)).toThrow(
      ForbiddenException,
    );
  });
});
