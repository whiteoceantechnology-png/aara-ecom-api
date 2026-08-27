import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsInt,
  IsNumber,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
} from "class-validator";
import { Transform, Type } from "class-transformer";

export class CreateVariantDto {
  @ApiProperty({ example: 1, description: "Product ID" })
  @IsInt()
  @Type(() => Number)
  productId: number;

  @ApiPropertyOptional({
    example: "ruby red shirt",
    description: "Display name for this variant",
  })
  @IsOptional()
  @IsString()
  variantName?: string;

  @ApiProperty({ example: 1, description: "Pack Size ID" })
  @IsInt()
  @Type(() => Number)
  packSizeId: number;

  @ApiProperty({ example: 31 })
  @IsNumber()
  @Type(() => Number)
  price: number;

  @ApiPropertyOptional({
    example: 28,
    description: "Variant discount price (stored as discountPrice)",
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  discountedPrice?: number;

  @ApiProperty({ example: "ASH-25" })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  status?: boolean;

  @ApiPropertyOptional({
    example: [
      "/images/products/Clotricks1739361360838.png",
      "/images/products/Clotricks1739361360839.png",
    ],
    description: "Variant image paths — stored as VariantImage rows",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imagePath?: string[];
}

export class UpdateVariantDto {
  @ApiPropertyOptional({ example: "ruby red shirt" })
  @IsOptional()
  @IsString()
  variantName?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  packSizeId?: number;

  @ApiPropertyOptional({ example: 31 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  price?: number;

  @ApiPropertyOptional({
    example: 28,
    description: "Variant discount price (stored as discountPrice)",
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  discountedPrice?: number;

  @ApiPropertyOptional({ example: "ASH-25" })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  status?: boolean;

  @ApiPropertyOptional({
    example: ["/images/products/a.png"],
    description: "Replaces all variant images when provided",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imagePath?: string[];
}
