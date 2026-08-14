import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response, Request } from "express";

/**
 * Global catch-all exception filter.
 * Ensures every error response follows the same JSON shape —
 * even unexpected runtime errors that would otherwise return raw HTML.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | string[];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message =
        typeof body === "string"
          ? body
          : ((body as { message?: string | string[] }).message ??
            exception.message);
    } else {
      const raw =
        exception instanceof Error
          ? `${exception.message}\n${exception.stack ?? ""}`
          : String(exception);
      const diskFull =
        /no space left on device/i.test(raw) ||
        /errcode:\s*28/i.test(raw) ||
        /ENOSPC/i.test(raw);

      if (diskFull) {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        message =
          "Server storage is full. Please free disk space and try again.";
      } else {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = "Internal server error";
      }

      // Log unexpected errors with full stack for debugging
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      error: HttpStatus[status] ?? "Error",
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
