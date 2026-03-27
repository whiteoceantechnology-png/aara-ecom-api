import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateReviewDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Type(() => Number)
  productId: number;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating: number;

  @ApiPropertyOptional({ example: "Great product." })
  @IsOptional()
  @IsString()
  @MinLength(1)
  comment?: string;

  @ApiProperty({
    description:
      "Order that included this product — required for verified-purchase reviews (order must be DELIVERED)",
    example: 42,
  })
  @IsInt()
  @Type(() => Number)
  orderId: number;
}
