import { InternalServerErrorException } from "@nestjs/common";

/**
 * Single source for the JWT signing/verification secret. There is deliberately
 * no fallback: a default secret would let anyone forge customer or admin tokens.
 */
export function getJwtSecret(): string {
  // Not trimmed: customer login signs with the raw value, so verification
  // must use exactly the same string or existing tokens would stop working.
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new InternalServerErrorException(
      "Authentication is not configured (JWT_SECRET)",
    );
  }
  return secret;
}
