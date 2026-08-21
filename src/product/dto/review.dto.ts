import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsInt,
  IsOptional,
  IsString,
  IsIn,
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

export class ListReviewsQueryDto {
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

  @ApiPropertyOptional({
    example: 2026,
    description: "Filter reviews for a single product",
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  productId?: number;

  @ApiPropertyOptional({
    example: 5,
    description: "Filter by star rating (1–5)",
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({
    enum: ["newest", "oldest", "highest", "lowest"],
    default: "newest",
  })
  @IsOptional()
  @IsIn(["newest", "oldest", "highest", "lowest"])
  sort?: "newest" | "oldest" | "highest" | "lowest" = "newest";
}
