import { TimeoutInterceptor } from "./timeout.interceptor";
import { TIMEOUT_MS_KEY } from "../decorators/timeout.decorator";
import { of, delay } from "rxjs";
import {
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

describe("TimeoutInterceptor", () => {
  let interceptor: TimeoutInterceptor;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    interceptor = new TimeoutInterceptor(reflector);
  });

  const createMockContext = (handlerMeta?: number): ExecutionContext => {
    const handler = () => undefined;
    if (handlerMeta !== undefined) {
      Reflect.defineMetadata(TIMEOUT_MS_KEY, handlerMeta, handler);
    }
    return {
      getHandler: () => handler,
      getClass: () => class TestController {},
      switchToHttp: () => ({
        getRequest: () => ({ method: "GET", url: "/test" }),
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as unknown as ExecutionContext;
  };

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

  it("should honor @Timeout override for longer handlers", (done) => {
    jest.useFakeTimers();
    const ctx = createMockContext(60_000);
    const next: CallHandler = {
      handle: () => of({ ok: true }).pipe(delay(20_000)),
    };

    interceptor.intercept(ctx, next).subscribe({
      next: (value) => {
        expect(value).toEqual({ ok: true });
        done();
      },
      error: () => done.fail("should not timeout under override"),
    });

    jest.advanceTimersByTime(20_000);
    jest.useRealTimers();
  });
});
