import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsNumber,
  IsBoolean,
} from "class-validator";
import { Transform, Type } from "class-transformer";

export class CreateProductDto {
  @ApiProperty({ example: 1, description: "Category ID" })
  @IsInt()
  @Type(() => Number)
  categoryId: number;

  @ApiProperty({ example: "Ashwagandha Root" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: "Pure dried Ashwagandha root",
    description: "Product description (unlimited length)",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: "12119029" })
  @IsOptional()
  @IsString()
  hsnCode?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  taxPercent?: number;

  @ApiPropertyOptional({
    example: 1,
    description:
      "Tax rate ID from GET /taxes — sets product taxPercent from master data",
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  taxId?: number;

  @ApiPropertyOptional({ example: 1699, description: "Original price" })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  actualPrice?: number;

  @ApiPropertyOptional({ example: 1455, description: "Discounted price" })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  discountPrice?: number;

  @ApiPropertyOptional({
    example: "/images/products/sample.png",
    description: "Product listing image",
  })
  @IsOptional()
  @IsString()
  productImage?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  status?: boolean;
}

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  categoryId?: number;

  @ApiPropertyOptional({ example: "Ashwagandha Root" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: "Pure dried root",
    description: "Product description (unlimited length)",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: "12119029" })
  @IsOptional()
  @IsString()
  hsnCode?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  taxPercent?: number;

  @ApiPropertyOptional({
    example: 1,
    description:
      "Optional. Tax master row from **GET /taxes**. When set, `taxPercent` on the product is taken from that row (overrides a raw `taxPercent` in the same request).",
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  taxId?: number;

  @ApiPropertyOptional({ example: 1699 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  actualPrice?: number;

  @ApiPropertyOptional({ example: 1455 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  discountPrice?: number;

  @ApiPropertyOptional({ example: "/images/products/sample.png" })
  @IsOptional()
  @IsString()
  productImage?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  status?: boolean;
}

export class ProductFilterDto {
  @ApiPropertyOptional({ example: 1, description: "Filter by category ID" })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  category?: number;

  @ApiPropertyOptional({
    example: "ashwagandha",
    description: "Search by product name",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: "Fabric",
    description: "Filter by spec key (use with specValue)",
  })
  @IsOptional()
  @IsString()
  specKey?: string;

  @ApiPropertyOptional({
    example: "Cotton",
    description: "Filter by spec value (use with specKey)",
  })
  @IsOptional()
  @IsString()
  specValue?: string;
}
