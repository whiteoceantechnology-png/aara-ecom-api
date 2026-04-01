import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";

/**
 * Requires a valid JWT whose payload includes `role` from
 * {@link AdminAuthService.login} (`admin` or `superadmin`).
 * Run after {@link JwtAuthGuard} on non-`@Public()` routes.
 */
@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<{ user?: { role?: string } }>();
    const role = req.user?.role;
    if (role === "admin" || role === "superadmin") return true;
    throw new ForbiddenException(
      "Admin access required — authenticate with POST /admin/auth/login and use that Bearer token",
    );
  }
}
