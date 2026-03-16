import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from "@nestjs/common";
import { Observable, throwError, TimeoutError } from "rxjs";
import { catchError, timeout } from "rxjs/operators";

const DEFAULT_TIMEOUT_MS = 15_000; // 15 seconds

/**
 * Automatically rejects requests that take too long.
 * Prevents slow queries or external calls from hanging the server.
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      timeout(DEFAULT_TIMEOUT_MS),
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
