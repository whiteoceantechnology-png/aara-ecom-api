import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable, map } from "rxjs";

/**
 * Wraps all successful responses in a consistent envelope:
 *
 *   { success: true, statusCode: 200, data: <payload> }
 *
 * This gives the frontend a predictable contract for every endpoint.
 * Error responses are NOT wrapped — they go through the exception filters.
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) => {
        const statusCode = context
          .switchToHttp()
          .getResponse<{ statusCode: number }>().statusCode;

        return {
          success: true,
          statusCode,
          data,
        };
      }),
    );
  }
}
