import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { AdminRoleGuard } from "./admin-role.guard";
import { denyOrReport } from "./principal";

/**
 * Admin-only check for catalog/order write routes outside `/admin`.
 * Honours `AUTHZ_ENFORCE`: until it is `true`, non-admin callers are still
 * allowed (as before) and only logged, so existing clients keep working.
 */
@Injectable()
export class StorefrontAdminGuard implements CanActivate {
  private readonly adminGuard = new AdminRoleGuard();

  canActivate(context: ExecutionContext): boolean {
    try {
      return this.adminGuard.canActivate(context);
    } catch {
      const req = context
        .switchToHttp()
        .getRequest<{ method?: string; originalUrl?: string }>();
      denyOrReport(`non-admin ${req.method} ${req.originalUrl}`);
      return true;
    }
  }
}
