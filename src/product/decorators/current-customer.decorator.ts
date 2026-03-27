import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";

/** Requires a customer JWT (`customerId` claim). */
export const CurrentCustomerId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number => {
    const req = ctx
      .switchToHttp()
      .getRequest<{ user?: { customerId?: number } }>();
    const id = req.user?.customerId;
    if (typeof id !== "number") {
      throw new ForbiddenException("Customer authentication required");
    }
    return id;
  },
);
