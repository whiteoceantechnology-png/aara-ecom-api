import { HttpStatus } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaExceptionFilter } from "./prisma-exception.filter";

describe("PrismaExceptionFilter", () => {
  let filter: PrismaExceptionFilter;
  let mockResponse: {
    status: jest.Mock;
    json: jest.Mock;
  };
  let mockHost: any;

  beforeEach(() => {
    filter = new PrismaExceptionFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => ({ method: "POST", url: "/test" }),
      }),
    };
  });

  // ─── PrismaClientKnownRequestError ──────────────────────────────────────────

  it("should return 409 Conflict for P2002 (unique constraint)", () => {
    const exception = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      { code: "P2002", clientVersion: "7.0.0", meta: { target: ["slug"] } },
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 409,
        message: expect.stringContaining("slug"),
        error: "Conflict",
      }),
    );
  });

  it("should return 400 Bad Request for P2003 (foreign key constraint)", () => {
    const exception = new Prisma.PrismaClientKnownRequestError(
      "Foreign key constraint failed",
      {
        code: "P2003",
        clientVersion: "7.0.0",
        meta: { field_name: "packSizeId" },
      },
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 400,
        message: expect.stringContaining("packSizeId"),
        error: "Bad Request",
      }),
    );
  });

  it("should return 404 Not Found for P2025 (record not found)", () => {
    const exception = new Prisma.PrismaClientKnownRequestError(
      "An operation failed",
      {
        code: "P2025",
        clientVersion: "7.0.0",
        meta: { cause: "Record to update not found" },
      },
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 404,
        message: "Record to update not found",
        error: "Not Found",
      }),
    );
  });

  it("should return 400 for P2011 (required field missing)", () => {
    const exception = new Prisma.PrismaClientKnownRequestError(
      "Null constraint violation",
      {
        code: "P2011",
        clientVersion: "7.0.0",
        meta: { constraint: "name" },
      },
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 400,
        message: expect.stringContaining("name"),
      }),
    );
  });

  it("should return 400 for P2014 (required relation violated)", () => {
    const exception = new Prisma.PrismaClientKnownRequestError(
      "Required relation violation",
      { code: "P2014", clientVersion: "7.0.0" },
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 400,
        message: expect.stringContaining("required relation"),
      }),
    );
  });

  it("should return 500 for unknown Prisma error codes", () => {
    const exception = new Prisma.PrismaClientKnownRequestError(
      "Something went wrong",
      { code: "P9999", clientVersion: "7.0.0" },
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 500,
        message: "An unexpected database error occurred",
      }),
    );
  });

  // ─── PrismaClientValidationError ────────────────────────────────────────────

  it("should return 400 for PrismaClientValidationError", () => {
    const exception = new Prisma.PrismaClientValidationError("Invalid query", {
      clientVersion: "7.0.0",
    });

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 400,
        message: expect.stringContaining("Invalid data"),
        error: "Bad Request",
      }),
    );
  });

  // ─── PrismaClientInitializationError ────────────────────────────────────────

  it("should return 503 for PrismaClientInitializationError", () => {
    const exception = new Prisma.PrismaClientInitializationError(
      "Can't reach database",
      "7.0.0",
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.SERVICE_UNAVAILABLE,
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 503,
        message: expect.stringContaining("unavailable"),
        error: "Service Unavailable",
      }),
    );
  });

  // ─── Common ────────────────────────────────────────────────────────────────

  it("should include timestamp in response", () => {
    const exception = new Prisma.PrismaClientKnownRequestError("Error", {
      code: "P2002",
      clientVersion: "7.0.0",
      meta: { target: ["email"] },
    });

    filter.catch(exception, mockHost);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        timestamp: expect.any(String),
      }),
    );
  });
});
