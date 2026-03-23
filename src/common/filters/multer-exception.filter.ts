import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response } from "express";
import { MulterError } from "multer";
import { UPLOAD_CONSTANTS } from "../constants/upload.constants";

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
    const maxSizeMB = UPLOAD_CONSTANTS.MAX_FILE_SIZE_BYTES / 1024 / 1024;
    const maxFiles = UPLOAD_CONSTANTS.MAX_FILES_PER_REQUEST;

    switch (exception.code) {
      case "LIMIT_FILE_SIZE":
        message = `File too large. Max size: ${maxSizeMB}MB`;
        break;
      case "LIMIT_FILE_COUNT":
        message = `Too many files. Max ${maxFiles} files per request`;
        break;
      case "LIMIT_UNEXPECTED_FILE":
        message = `Unexpected field. Use form field "files" for upload`;
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
