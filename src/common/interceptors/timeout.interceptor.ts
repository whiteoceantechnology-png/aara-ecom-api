import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, throwError, TimeoutError } from "rxjs";
import { catchError, timeout } from "rxjs/operators";
import { TIMEOUT_MS_KEY } from "../decorators/timeout.decorator";

export const DEFAULT_TIMEOUT_MS = 15_000; // 15 seconds

/**
 * Automatically rejects requests that take too long.
 * Prevents slow queries or external calls from hanging the server.
 * Handlers may opt into a longer limit via `@Timeout(ms)`.
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly reflector = new Reflector()) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ms =
      this.reflector.getAllAndOverride<number>(TIMEOUT_MS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? DEFAULT_TIMEOUT_MS;

    return next.handle().pipe(
      timeout(ms),
      catchError((err: unknown) => {
        if (err instanceof TimeoutError) {
          return throwError(
            () =>
              new RequestTimeoutException(
                "Request timed out. Please try again later.",
              ),
          );
        }
        return throwError(() => err);
      }),
    );
  }
}
