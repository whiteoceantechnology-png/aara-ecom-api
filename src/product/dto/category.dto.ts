import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export class CreateCategoryDto {
  @ApiProperty({
    example: "Raw Dried Herbs",
    description: "Display name for the category.",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: "/images/category/sample.png",
    description: "Optional category image URL or upload path.",
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

  @ApiPropertyOptional({ example: "/images/category/sample.png" })
  @IsOptional()
  @IsString()
  categoryImage?: string;
}
