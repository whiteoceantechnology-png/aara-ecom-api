import { ApiProperty } from "@nestjs/swagger";
import { IsInt } from "class-validator";
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
