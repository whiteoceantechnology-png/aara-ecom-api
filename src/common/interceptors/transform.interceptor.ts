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
 * If a handler returns `{ message, data }`, `message` is lifted to the envelope.
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

        if (
          data != null &&
          typeof data === "object" &&
          !Array.isArray(data) &&
          "message" in data &&
          "data" in data
        ) {
          const payload = data as { message: unknown; data: unknown };
          return {
            success: true,
            statusCode,
            message: payload.message,
            data: payload.data,
          };
        }

        return {
          success: true,
          statusCode,
          data,
        };
      }),
    );
  }
}
