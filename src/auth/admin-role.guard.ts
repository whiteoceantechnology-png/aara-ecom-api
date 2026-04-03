import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";

type JwtPayloadLike = {
  role?: unknown;
  sub?: unknown;
  username?: unknown;
  userId?: unknown;
  customerId?: unknown;
};

function isAdminRole(role: unknown): boolean {
  return role === "admin" || role === "superadmin";
}

/**
 * Requires an **admin** JWT from {@link AdminAuthService.login}:
 * `role` is `admin` or `superadmin`, or (legacy) `sub` + `username` without `userId` / `customerId`.
 * Store user tokens (`userId`) and customer tokens (`customerId`) are rejected with a clear message.
 */
@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: JwtPayloadLike }>();
    const p = req.user;
    if (!p) {
      throw new ForbiddenException(
        "Admin access required — authenticate with POST /admin/auth/login and use that Bearer token",
      );
    }

    if (isAdminRole(p.role)) return true;

    const hasUserId = p.userId != null;
    const hasCustomerId = p.customerId != null;
    const hasSub = p.sub != null;
    const hasUsername = typeof p.username === "string" && p.username.length > 0;

    if (hasUserId) {
      throw new ForbiddenException(
        "This route needs an admin JWT from POST /admin/auth/login — you are using a store user token from POST /auth/login (userId in payload).",
      );
    }
    if (hasCustomerId) {
      throw new ForbiddenException(
        "This route needs an admin JWT from POST /admin/auth/login — you are using a customer token from POST /customers/login (customerId in payload).",
      );
    }

    if (hasSub && hasUsername) {
      return true;
    }

    throw new ForbiddenException(
      "Admin access required — authenticate with POST /admin/auth/login (username + password) and send the returned token as Bearer.",
    );
  }
}
