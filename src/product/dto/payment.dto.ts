import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString } from "class-validator";
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
}
