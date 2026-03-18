import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  StreamableFile,
} from "@nestjs/common";
import { Observable, map } from "rxjs";

/**
 * Wraps all successful responses in a consistent envelope:
 *
 *   { success: true, statusCode: 200, data: <payload> }
 *
 * This gives the frontend a predictable contract for every endpoint.
 * Error responses are NOT wrapped — they go through the exception filters.
 * StreamableFile responses are passed through without wrapping.
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) => {
        if (data instanceof StreamableFile) return data;

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
