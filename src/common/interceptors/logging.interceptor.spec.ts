import { LoggingInterceptor } from "./logging.interceptor";
import { of } from "rxjs";
import { ExecutionContext, CallHandler } from "@nestjs/common";

describe("LoggingInterceptor", () => {
  let interceptor: LoggingInterceptor;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
  });

  const createMockContext = (): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ method: "GET", url: "/test" }),
        getResponse: () => ({ statusCode: 200 }),
      }),
    }) as unknown as ExecutionContext;

  it("should be defined", () => {
    expect(interceptor).toBeDefined();
  });

  it("should call next.handle() and return its result", (done) => {
    const ctx = createMockContext();
    const next: CallHandler = { handle: () => of({ id: 1 }) };

    interceptor.intercept(ctx, next).subscribe((value) => {
      expect(value).toEqual({ id: 1 });
      done();
    });
  });

  it("should not modify the response data", (done) => {
    const ctx = createMockContext();
    const payload = { foo: "bar", nested: { a: 1 } };
    const next: CallHandler = { handle: () => of(payload) };

    interceptor.intercept(ctx, next).subscribe((value) => {
      expect(value).toBe(payload);
      done();
    });
  });
});
