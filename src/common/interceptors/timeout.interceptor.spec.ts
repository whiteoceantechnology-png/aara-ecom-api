import { TimeoutInterceptor } from "./timeout.interceptor";
import { of, delay } from "rxjs";
import {
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from "@nestjs/common";

describe("TimeoutInterceptor", () => {
  let interceptor: TimeoutInterceptor;

  beforeEach(() => {
    interceptor = new TimeoutInterceptor();
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

  it("should pass through fast responses without error", (done) => {
    const ctx = createMockContext();
    const next: CallHandler = { handle: () => of({ ok: true }) };

    interceptor.intercept(ctx, next).subscribe({
      next: (value) => {
        expect(value).toEqual({ ok: true });
        done();
      },
      error: () => done.fail("should not error"),
    });
  });

  it("should throw RequestTimeoutException for slow responses", (done) => {
    jest.useFakeTimers();
    const ctx = createMockContext();
    // Observable that emits after 20 seconds (greater than 15s timeout)
    const next: CallHandler = {
      handle: () => of({ ok: true }).pipe(delay(20_000)),
    };

    interceptor.intercept(ctx, next).subscribe({
      next: () => done.fail("should not emit"),
      error: (err: unknown) => {
        expect(err).toBeInstanceOf(RequestTimeoutException);
        done();
      },
    });

    jest.advanceTimersByTime(16_000);
    jest.useRealTimers();
  });
});
