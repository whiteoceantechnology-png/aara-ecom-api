import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class AddToCartDto {
  @ApiProperty({ example: 1, description: 'Customer ID' })
  @IsInt()
  @Type(() => Number)
  customerId: number;

  @ApiProperty({ example: 1, description: 'Product Variant ID' })
  @IsInt()
  @Type(() => Number)
  variantId: number;

  @ApiProperty({ example: 2, description: 'Quantity' })
  @IsInt()
  @Type(() => Number)
  quantity: number;
}

export class UpdateCartItemDto {
  @ApiProperty({ example: 1, description: 'Cart Item ID' })
  @IsInt()
  @Type(() => Number)
  cartItemId: number;

  @ApiProperty({ example: 3, description: 'New quantity' })
  @IsInt()
  @Type(() => Number)
  quantity: number;
}

export class RemoveCartItemDto {
  @ApiProperty({ example: 1, description: 'Cart Item ID' })
  @IsInt()
  @Type(() => Number)
  cartItemId: number;
}
