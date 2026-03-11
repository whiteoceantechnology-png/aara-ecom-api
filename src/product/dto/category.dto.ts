import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Raw Dried Herbs' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'raw-dried-herbs' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiPropertyOptional({ example: null, description: 'Parent category ID for sub-categories' })
  @IsOptional()
  @IsInt()
  parentId?: number;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Raw Dried Herbs' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'raw-dried-herbs' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: null })
  @IsOptional()
  @IsInt()
  parentId?: number;
}
