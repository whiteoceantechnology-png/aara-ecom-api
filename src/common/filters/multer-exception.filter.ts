import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response } from "express";
import { MulterError } from "multer";

/**
 * Catches Multer errors (e.g. LIMIT_FILE_SIZE) and returns proper 4xx responses
 * instead of 500 Internal Server Error.
 */
@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(MulterExceptionFilter.name);

  catch(exception: MulterError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = HttpStatus.BAD_REQUEST;
    let message: string;

    switch (exception.code) {
      case "LIMIT_FILE_SIZE":
        message = "File too large. Max size: 5MB";
        break;
      case "LIMIT_FILE_COUNT":
        message = "Too many files. Only one file allowed";
        break;
      case "LIMIT_UNEXPECTED_FILE":
        message = `Unexpected field. Use field name "file" for upload`;
        break;
      default:
        message = "File upload error";
        this.logger.warn(`Unhandled MulterError: ${exception.code}`);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      error: "Bad Request",
      timestamp: new Date().toISOString(),
    });
  }
}
