import { TransformInterceptor } from "./transform.interceptor";
import { of } from "rxjs";
import { ExecutionContext, CallHandler } from "@nestjs/common";

describe("TransformInterceptor", () => {
  let interceptor: TransformInterceptor;

  const createMockContext = (statusCode = 200): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({ statusCode }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  it("should be defined", () => {
    expect(interceptor).toBeDefined();
  });

  it("should wrap response in { success, statusCode, data } envelope", (done) => {
    const ctx = createMockContext(200);
    const payload = { id: 1, name: "Test" };
    const next: CallHandler = { handle: () => of(payload) };

    interceptor.intercept(ctx, next).subscribe((value) => {
      expect(value).toEqual({
        success: true,
        statusCode: 200,
        data: payload,
      });
      done();
    });
  });

  it("should preserve 201 statusCode for created resources", (done) => {
    const ctx = createMockContext(201);
    const payload = { id: 1 };
    const next: CallHandler = { handle: () => of(payload) };

    interceptor.intercept(ctx, next).subscribe((value) => {
      expect(value).toEqual({
        success: true,
        statusCode: 201,
        data: payload,
      });
      done();
    });
  });

  it("should wrap null data correctly", (done) => {
    const ctx = createMockContext(200);
    const next: CallHandler = { handle: () => of(null) };

    interceptor.intercept(ctx, next).subscribe((value) => {
      expect(value).toEqual({
        success: true,
        statusCode: 200,
        data: null,
      });
      done();
    });
  });

  it("should wrap array data correctly", (done) => {
    const ctx = createMockContext(200);
    const payload = [{ id: 1 }, { id: 2 }];
    const next: CallHandler = { handle: () => of(payload) };

    interceptor.intercept(ctx, next).subscribe((value) => {
      expect(value).toEqual({
        success: true,
        statusCode: 200,
        data: payload,
      });
      done();
    });
  });
});
