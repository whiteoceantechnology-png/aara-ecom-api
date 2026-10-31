import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from "@nestjs/common";

const logger = new Logger("Authz");

/**
 * Access checks only block requests when `AUTHZ_ENFORCE=true`. Otherwise they
 * run in report-only mode: existing behaviour is unchanged and each request
 * that *would* be denied is logged, so clients can be verified before enforcing.
 */
export function isAuthzEnforced(): boolean {
  return process.env.AUTHZ_ENFORCE === "true";
}

/** Throws when enforcing; otherwise logs the would-be denial and allows it. */
export function denyOrReport(reason: string): void {
  if (isAuthzEnforced()) {
    throw new ForbiddenException("You do not have access to this resource");
  }
  logger.warn(`[report-only] would deny: ${reason}`);
}

/** Decoded JWT payload set on `request.user` by {@link JwtAuthGuard}. */
export type AuthPrincipal = {
  role?: unknown;
  sub?: unknown;
  username?: unknown;
  userId?: unknown;
  customerId?: unknown;
};

/**
 * Admin JWT: `role` is admin/superadmin, or (legacy) `sub` + `username`
 * without `userId` / `customerId`. Mirrors {@link AdminRoleGuard}.
 */
export function isAdminPrincipal(p: AuthPrincipal | undefined): boolean {
  if (!p) return false;
  if (p.role === "admin" || p.role === "superadmin") return true;
  return (
    p.userId == null &&
    p.customerId == null &&
    p.sub != null &&
    typeof p.username === "string" &&
    p.username.length > 0
  );
}

/**
 * Denies (403, or a log line in report-only mode) unless the caller is an
 * admin or the resource owner: the token's `claim` equal to `ownerId`.
 */
export function assertSelfOrAdmin(
  p: AuthPrincipal | undefined,
  claim: "customerId" | "userId",
  ownerId: number | null | undefined,
): void {
  if (isAdminPrincipal(p)) return;
  const raw = p?.[claim];
  const id = typeof raw === "number" ? raw : Number(raw);
  if (ownerId == null || !Number.isFinite(id) || id !== ownerId) {
    denyOrReport(`${claim}=${String(raw)} accessing owner ${String(ownerId)}`);
  }
}

/** Full JWT payload of the caller (empty object on public routes). */
export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthPrincipal =>
    ctx.switchToHttp().getRequest<{ user?: AuthPrincipal }>().user ?? {},
);
