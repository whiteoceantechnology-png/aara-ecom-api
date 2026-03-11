import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsOptional, IsInt, IsNumber, IsBoolean,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 1, description: 'Category ID' })
  @IsInt()
  @Type(() => Number)
  categoryId: number;

  @ApiProperty({ example: 'Ashwagandha Root' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'ashwagandha-root' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiPropertyOptional({ example: 'Pure dried Ashwagandha root' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '12119029' })
  @IsOptional()
  @IsString()
  hsnCode?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  taxPercent?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  status?: boolean;
}

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  categoryId?: number;

  @ApiPropertyOptional({ example: 'Ashwagandha Root' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'ashwagandha-root' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 'Pure dried root' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '12119029' })
  @IsOptional()
  @IsString()
  hsnCode?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  taxPercent?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  status?: boolean;
}

export class ProductFilterDto {
  @ApiPropertyOptional({ example: 1, description: 'Filter by category ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  category?: number;

  @ApiPropertyOptional({ example: 'ashwagandha', description: 'Search by product name' })
  @IsOptional()
  @IsString()
  search?: string;
}
