import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export class CreateCategoryDto {
  @ApiProperty({ example: "Raw Dried Herbs" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: "/images/category/sample.png",
    description: "Category image URL",
  })
  @IsOptional()
  @IsString()
  categoryImage?: string;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: "Raw Dried Herbs" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: "raw-dried-herbs" })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: "/images/category/sample.png" })
  @IsOptional()
  @IsString()
  categoryImage?: string;
}
