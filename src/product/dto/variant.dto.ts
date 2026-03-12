import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsInt,
  IsNumber,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
} from "class-validator";
import { Transform, Type } from "class-transformer";

export class CreateVariantDto {
  @ApiProperty({ example: 1, description: "Product ID" })
  @IsInt()
  @Type(() => Number)
  productId: number;

  @ApiProperty({ example: 1, description: "Pack Size ID" })
  @IsInt()
  @Type(() => Number)
  packSizeId: number;

  @ApiProperty({ example: 31 })
  @IsNumber()
  @Type(() => Number)
  price: number;

  @ApiProperty({ example: "ASH-25" })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  stockQuantity?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  status?: boolean;
}

export class UpdateVariantDto {
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

  @ApiPropertyOptional({ example: "ASH-25" })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  stockQuantity?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  status?: boolean;
}
