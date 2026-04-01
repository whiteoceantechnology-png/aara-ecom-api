import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";

/**
 * App-user JWT (`userId` claim) set by {@link JwtAuthGuard}.
 * Not for customer tokens (`customerId`).
 */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number => {
    const req = ctx
      .switchToHttp()
      .getRequest<{ user?: { userId?: unknown } }>();
    const raw = req.user?.userId;
    const id = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(id)) {
      throw new UnauthorizedException("Invalid token payload");
    }
    return id;
  },
);
