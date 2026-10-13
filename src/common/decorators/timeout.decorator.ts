import { SetMetadata } from "@nestjs/common";

export const TIMEOUT_MS_KEY = "timeoutMs";

/** Override the global request timeout (ms) for a handler or controller. */
export const Timeout = (ms: number) => SetMetadata(TIMEOUT_MS_KEY, ms);
