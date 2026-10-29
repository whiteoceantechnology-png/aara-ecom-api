import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";

export class CreateRazorpayOrderDto {
  @ApiProperty({ example: 1, description: "Order ID (from your system)" })
  @IsInt()
  @Type(() => Number)
  orderId: number;
}

export class VerifyRazorpayPaymentDto {
  @ApiProperty({ example: 1, description: "Order ID (from your system)" })
  @IsInt()
  @Type(() => Number)
  orderId: number;

  @ApiProperty({
    example: "order_xxx",
    description: "Razorpay order ID (from checkout response)",
  })
  @IsString()
  razorpayOrderId: string;

  @ApiProperty({
    example: "pay_xxx",
    description: "Razorpay payment ID (from checkout response)",
  })
  @IsString()
  razorpayPaymentId: string;

  @ApiProperty({
    example: "signature_xxx",
    description: "Razorpay signature (from checkout response)",
  })
  @IsString()
  razorpaySignature: string;

  @ApiPropertyOptional({
    example: "purchase_order_AARA-0001",
    description:
      "Same event ID used by the browser Meta Pixel Purchase event (fbq 'eventID' option) — required to deduplicate the server-side Meta Conversions API event against the Pixel event. If omitted, the backend derives `purchase_order_<orderNumber>`.",
  })
  @IsOptional()
  @IsString()
  metaEventId?: string;

  @ApiPropertyOptional({
    description: "Browser `_fbp` cookie value, for Meta CAPI match quality",
  })
  @IsOptional()
  @IsString()
  fbp?: string;

  @ApiPropertyOptional({
    description:
      "Browser `_fbc` cookie value (or derived from fbclid), for Meta CAPI match quality",
  })
  @IsOptional()
  @IsString()
  fbc?: string;

  @ApiPropertyOptional({
    example: "https://aaraahomecare.com/order-confirmation/AARA-0001",
    description: "Page URL where the Purchase event fires, for Meta CAPI",
  })
  @IsOptional()
  @IsString()
  eventSourceUrl?: string;
}
