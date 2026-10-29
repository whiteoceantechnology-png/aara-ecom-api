import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";
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
    description:
      "Customer address ID (must belong to the authenticated customer)",
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  addressId?: number;

  @ApiProperty({
    enum: CheckoutPaymentMethod,
    description:
      "COD deducts stock immediately; CARD/UPI/NETBANKING reserve until payment",
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

  @ApiPropertyOptional({
    example: "initiate_checkout_1730000000000_ab12cd",
    description:
      "Same event ID as the browser Meta Pixel InitiateCheckout event (fbq 'eventID'). Required to send the server-side InitiateCheckout event; without it no CAPI event is sent.",
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
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
    example: "https://aaraahomecare.com/checkout",
    description:
      "Page URL where the InitiateCheckout event fires, for Meta CAPI",
  })
  @IsOptional()
  @IsString()
  eventSourceUrl?: string;
}
