import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsInt, IsOptional, IsString, MinLength } from "class-validator";
import { Type } from "class-transformer";

export class ApplyCouponDto {
  @ApiProperty({ example: "SAVE10" })
  @IsString()
  @MinLength(2)
  couponCode: string;
}

export enum CheckoutPaymentMethod {
  CARD = "CARD",
  COD = "COD",
  UPI = "UPI",
  NETBANKING = "NETBANKING",
}

export class PlaceOrderDto {
  @ApiPropertyOptional({
    description: "Customer address ID (must belong to the authenticated customer)",
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  addressId?: number;

  @ApiProperty({
    enum: CheckoutPaymentMethod,
    description: "COD deducts stock immediately; CARD/UPI/NETBANKING reserve until payment",
  })
  @IsEnum(CheckoutPaymentMethod)
  paymentMethod: CheckoutPaymentMethod;

  @ApiPropertyOptional({
    description: "Overrides checkout session coupon when provided",
    example: "SAVE10",
  })
  @IsOptional()
  @IsString()
  couponCode?: string;
}
