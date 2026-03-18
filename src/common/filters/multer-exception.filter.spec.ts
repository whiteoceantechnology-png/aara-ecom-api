import { MulterExceptionFilter } from "./multer-exception.filter";
import { ArgumentsHost } from "@nestjs/common";
import { MulterError } from "multer";

const createMockHost = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  return {
    switchToHttp: () => ({
      getResponse: () => res,
    }),
    res,
  } as unknown as ArgumentsHost;
};

describe("MulterExceptionFilter", () => {
  let filter: MulterExceptionFilter;

  beforeEach(() => {
    filter = new MulterExceptionFilter();
  });

  it("should return 400 for LIMIT_FILE_SIZE", () => {
    const err = new MulterError("LIMIT_FILE_SIZE", "file");
    const host = createMockHost();

    filter.catch(err, host);

    expect(host.res.status).toHaveBeenCalledWith(400);
    expect(host.res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 400,
        message: "File too large. Max size: 5MB",
        error: "Bad Request",
      }),
    );
  });

  it("should return 400 for LIMIT_FILE_COUNT", () => {
    const err = new MulterError("LIMIT_FILE_COUNT", "file");
    const host = createMockHost();

    filter.catch(err, host);

    expect(host.res.status).toHaveBeenCalledWith(400);
    expect(host.res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Too many files. Only one file allowed",
      }),
    );
  });

  it("should return 400 for LIMIT_UNEXPECTED_FILE", () => {
    const err = new MulterError("LIMIT_UNEXPECTED_FILE", "wrongField");
    const host = createMockHost();

    filter.catch(err, host);

    expect(host.res.status).toHaveBeenCalledWith(400);
    expect(host.res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("file"),
      }),
    );
  });
});
