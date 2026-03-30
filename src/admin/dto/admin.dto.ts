import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

// ─── Brand DTOs ───────────────────────────────────────────────────────────────

export class CreateBrandDto {
  @ApiProperty({ example: "Himalaya" })
  @IsString()
  name: string;

  @ApiProperty({ example: "himalaya" })
  @IsString()
  slug: string;

  @ApiPropertyOptional({ example: "https://cdn.example.com/himalaya.png" })
  @IsOptional()
  @IsString()
  logoUrl?: string;
}

export class UpdateBrandDto {
  @ApiPropertyOptional({ example: "Himalaya Wellness" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: "himalaya-wellness" })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: "https://cdn.example.com/logo.png" })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ─── Product Management DTOs ─────────────────────────────────────────────────

export class AdminCreateProductDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @Type(() => Number)
  categoryId: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  brandId?: number;

  @ApiProperty({ example: "Ashwagandha Root" })
  @IsString()
  name: string;

  @ApiProperty({ example: "ashwagandha-root" })
  @IsString()
  slug: string;

  @ApiPropertyOptional({ example: "Premium quality ashwagandha root powder" })
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
}

export class AdminUpdateProductDto {
  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  categoryId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  brandId?: number;

  @ApiPropertyOptional({ example: "Ashwagandha Powder" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: "ashwagandha-powder" })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: "Updated description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: "12119029" })
  @IsOptional()
  @IsString()
  hsnCode?: string;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  taxPercent?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  status?: boolean;
}

export class AdminUpdateStockDto {
  @ApiProperty({ example: 100 })
  @IsNumber()
  @Type(() => Number)
  stockQuantity: number;
}

export class AdminAddImageDto {
  @ApiProperty({
    example: "2026/03/20/1773990762403-cfbcb565.jpeg",
    description:
      "Image path from upload API (POST /admin/images/upload) or full URL",
  })
  @IsString()
  imageUrl: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

// ─── Category DTOs ───────────────────────────────────────────────────────────

export class AdminCreateCategoryDto {
  @ApiProperty({ example: "Raw Dried Herbs" })
  @IsString()
  name: string;

  @ApiProperty({ example: "raw-dried-herbs" })
  @IsString()
  slug: string;

  @ApiPropertyOptional({
    example: "2026/03/20/1773990762403-cfbcb565.jpeg",
    description: "Image path from upload API (POST /admin/images/upload)",
  })
  @IsOptional()
  @IsString()
  categoryImage?: string;
}

export class AdminUpdateCategoryDto {
  @ApiPropertyOptional({ example: "Dried Herbs" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: "dried-herbs" })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({
    example: "2026/03/20/1773990762403-cfbcb565.jpeg",
    description: "Image path from upload API (POST /admin/images/upload)",
  })
  @IsOptional()
  @IsString()
  categoryImage?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ─── Order Management DTOs ───────────────────────────────────────────────────

export class AdminUpdateOrderDto {
  @ApiPropertyOptional({
    example: "shipped",
    enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: "TRK-987654321" })
  @IsOptional()
  @IsString()
  trackingId?: string;

  @ApiPropertyOptional({ example: "Handle with care" })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ─── Customer Management DTOs ────────────────────────────────────────────────

export class AdminCustomerFilterDto {
  @ApiPropertyOptional({ example: "john" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isBlocked?: boolean;
}

// ─── Specification DTOs ──────────────────────────────────────────────────────

export class SpecItemDto {
  @ApiProperty({ example: "Fabric" })
  @IsString()
  key: string;

  @ApiProperty({ example: "Cotton" })
  @IsString()
  value: string;
}

export class SpecSectionDto {
  @ApiProperty({ example: "Product Details" })
  @IsString()
  title: string;

  @ApiProperty({
    type: [SpecItemDto],
    example: [
      { key: "Fabric", value: "Cotton" },
      { key: "Fit", value: "Regular" },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpecItemDto)
  items: SpecItemDto[];
}

export class SpecificationDescriptionDto {
  @ApiPropertyOptional({ example: "Brief product summary" })
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiPropertyOptional({ example: "Full product description with details" })
  @IsOptional()
  @IsString()
  longDescription?: string;

  /** Same as `longDescription` — preferred by some clients */
  @ApiPropertyOptional({
    example: "Step up your style game with these classic white trousers...",
  })
  @IsOptional()
  @IsString()
  productDescription?: string;

  @ApiPropertyOptional({
    example: "<ul><li>Feature 1</li><li>Feature 2</li></ul>",
  })
  @IsOptional()
  @IsString()
  moreInfoHtml?: string;

  /** Same as `moreInfoHtml` — preferred by some clients */
  @ApiPropertyOptional({
    example: "<ul><li>Premium fabric for comfort & durability</li></ul>",
  })
  @IsOptional()
  @IsString()
  moreInfo?: string;
}

export class UpsertSpecificationBodyDto {
  @ApiProperty({
    type: [SpecSectionDto],
    example: [
      {
        title: "Product Details",
        items: [
          { key: "Fabric", value: "Cotton" },
          { key: "Fit", value: "Regular" },
        ],
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpecSectionDto)
  specification: SpecSectionDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => SpecificationDescriptionDto)
  description?: SpecificationDescriptionDto;
}

export type UpsertSpecificationDto = UpsertSpecificationBodyDto & {
  productId: number;
};
