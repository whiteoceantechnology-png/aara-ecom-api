import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export class AddToWishlistDto {
  @ApiProperty({ example: 7, description: "Product ID to save" })
  @IsInt()
  @Type(() => Number)
  @Min(1)
  productId: number;
}

export class WishlistQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
