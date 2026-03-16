import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Response } from "express";

/**
 * Global exception filter that catches all Prisma-related errors and returns
 * clean, developer-friendly JSON responses instead of raw stack traces.
 *
 * Handles:
 *  - PrismaClientKnownRequestError  (P2002, P2003, P2025, P2011, P2000, P2014, P2016)
 *  - PrismaClientValidationError     (bad query / wrong field types)
 *  - PrismaClientInitializationError (DB connection failures)
 */
@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientValidationError,
  Prisma.PrismaClientInitializationError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception:
      | Prisma.PrismaClientKnownRequestError
      | Prisma.PrismaClientValidationError
      | Prisma.PrismaClientInitializationError,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status: number;
    let message: string;

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      ({ status, message } = this.handleKnownRequestError(exception));
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message =
        "Invalid data provided. Please check your request body and try again.";
    } else {
      // PrismaClientInitializationError — DB is down or unreachable
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = "Database is currently unavailable. Please try again later.";
    }

    this.logger.error(
      `Prisma error: ${exception.message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      error: this.getErrorName(status),
      timestamp: new Date().toISOString(),
    });
  }

  private handleKnownRequestError(
    exception: Prisma.PrismaClientKnownRequestError,
  ): { status: number; message: string } {
    switch (exception.code) {
      // Unique constraint violation
      case "P2002": {
        const fields = (exception.meta?.target as string[]) ?? [];
        return {
          status: HttpStatus.CONFLICT,
          message: `A record with this ${fields.join(", ")} already exists`,
        };
      }

      // Foreign key constraint violation
      case "P2003": {
        const field = (exception.meta?.field_name as string) ?? "field";
        return {
          status: HttpStatus.BAD_REQUEST,
          message: `Invalid reference: related ${field} does not exist`,
        };
      }

      // Record not found (for update/delete operations)
      case "P2025": {
        const cause = exception.meta?.cause as string | undefined;
        return {
          status: HttpStatus.NOT_FOUND,
          message: cause ?? "The requested record was not found",
        };
      }

      // Required field missing
      case "P2011": {
        const constraint = (exception.meta?.constraint as string) ?? "field";
        return {
          status: HttpStatus.BAD_REQUEST,
          message: `Required field is missing: ${constraint}`,
        };
      }

      // Value too long for column
      case "P2000": {
        const column = (exception.meta?.column_name as string) ?? "field";
        return {
          status: HttpStatus.BAD_REQUEST,
          message: `The value provided for ${column} is too long`,
        };
      }

      // Required relation not found
      case "P2014": {
        return {
          status: HttpStatus.BAD_REQUEST,
          message:
            "The change you are trying to make would violate a required relation",
        };
      }

      // Query interpretation error
      case "P2016": {
        return {
          status: HttpStatus.BAD_REQUEST,
          message: "Query interpretation error — check the provided IDs",
        };
      }

      default: {
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: "An unexpected database error occurred",
        };
      }
    }
  }

  private getErrorName(status: number): string {
    const names: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: "Bad Request",
      [HttpStatus.NOT_FOUND]: "Not Found",
      [HttpStatus.CONFLICT]: "Conflict",
      [HttpStatus.SERVICE_UNAVAILABLE]: "Service Unavailable",
      [HttpStatus.INTERNAL_SERVER_ERROR]: "Internal Server Error",
    };
    return names[status] ?? "Error";
  }
}
