import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";

export class AddToCartDto {
  @ApiProperty({ example: 1, description: "Product ID" })
  @IsInt()
  @Type(() => Number)
  productId: number;

  @ApiProperty({ example: 1, description: "Product Variant ID" })
  @IsInt()
  @Type(() => Number)
  variantId: number;

  @ApiProperty({ example: 2, description: "Quantity" })
  @IsInt()
  @Type(() => Number)
  quantity: number;

  @ApiPropertyOptional({
    example: "atc_1730000000000_ab12cd",
    description:
      "Same event ID as the browser Meta Pixel AddToCart event (fbq 'eventID'). Required to send the server-side AddToCart event; without it no CAPI event is sent to avoid double counting.",
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
    example: "https://aaraahomecare.com/product/example",
    description: "Page URL where the AddToCart event fires, for Meta CAPI",
  })
  @IsOptional()
  @IsString()
  eventSourceUrl?: string;
}

export class UpdateCartItemDto {
  @ApiProperty({ example: 1, description: "Cart Item ID" })
  @IsInt()
  @Type(() => Number)
  cartItemId: number;

  @ApiProperty({ example: 3, description: "New quantity" })
  @IsInt()
  @Type(() => Number)
  quantity: number;
}

export class RemoveCartItemDto {
  @ApiProperty({ example: 1, description: "Cart Item ID" })
  @IsInt()
  @Type(() => Number)
  cartItemId: number;
}
