import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";

export class CreateOrderDto {
  @ApiProperty({ example: 1, description: "Customer ID" })
  @IsInt()
  @Type(() => Number)
  customerId: number;

  @ApiProperty({ example: 1, description: "Cart ID to convert to order" })
  @IsInt()
  @Type(() => Number)
  cartId: number;
}

export class UpdateOrderStatusDto {
  @ApiProperty({
    example: "SHIPPED",
    description:
      "Fulfillment status. Use PROCESSING, SHIPPED, DELIVERED, CANCELLED, FAILED (legacy rows may still show pending).",
    enum: [
      "pending",
      "PENDING_PAYMENT",
      "PROCESSING",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
      "FAILED",
    ],
  })
  @IsString()
  status: string;
}

export class CreatePaymentDto {
  @ApiProperty({ example: 1, description: "Order ID" })
  @IsInt()
  @Type(() => Number)
  orderId: number;

  @ApiProperty({ example: "UPI", enum: ["UPI", "COD", "CARD", "NETBANKING"] })
  @IsString()
  paymentMethod: string;

  @ApiPropertyOptional({ example: "TXN123456" })
  @IsOptional()
  @IsString()
  transactionId?: string;
}
