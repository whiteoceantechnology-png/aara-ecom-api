import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Transform, Type } from "class-transformer";

export enum CourierIntegrationType {
  MANUAL = "MANUAL",
  API = "API",
}

export enum CourierStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export class CourierStateInputDto {
  @ApiPropertyOptional({
    example: 1,
    description: "Present on update to keep an existing state row",
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  id?: number;

  @ApiProperty({ example: "Tamil Nadu" })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: "TN" })
  @IsString()
  @MinLength(1)
  @MaxLength(16)
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value,
  )
  code: string;
}

export class CourierRateRuleInputDto {
  @ApiPropertyOptional({
    example: 101,
    description: "Present on update to keep an existing rate rule",
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  id?: number;

  @ApiProperty({ example: 0, description: "Inclusive lower weight (kg)" })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minWeight: number;

  @ApiPropertyOptional({
    example: 7,
    description: "Inclusive upper weight (kg). Null = no upper bound",
    nullable: true,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxWeight?: number | null;

  @ApiProperty({ example: 40 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  ratePerKg: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === "true")
  freeShipping?: boolean;
}

export class CreateCourierDto {
  @ApiProperty({ example: "ST Courier" })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: "ST" })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value,
  )
  code: string;

  @ApiProperty({
    example: "MANUAL",
    enum: CourierIntegrationType,
  })
  @IsEnum(CourierIntegrationType)
  integrationType: CourierIntegrationType;

  @ApiPropertyOptional({
    example: "ACTIVE",
    enum: CourierStatus,
    default: CourierStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(CourierStatus)
  status?: CourierStatus;

  @ApiPropertyOptional({ type: [CourierStateInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CourierStateInputDto)
  @ArrayUnique((s: CourierStateInputDto) => s.code)
  states?: CourierStateInputDto[];

  @ApiPropertyOptional({ type: [CourierRateRuleInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CourierRateRuleInputDto)
  rateRules?: CourierRateRuleInputDto[];
}

export class UpdateCourierDto {
  @ApiPropertyOptional({ example: "ST Courier" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: "ST" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value,
  )
  code?: string;

  @ApiPropertyOptional({ example: "MANUAL", enum: CourierIntegrationType })
  @IsOptional()
  @IsEnum(CourierIntegrationType)
  integrationType?: CourierIntegrationType;

  @ApiPropertyOptional({ example: "ACTIVE", enum: CourierStatus })
  @IsOptional()
  @IsEnum(CourierStatus)
  status?: CourierStatus;

  @ApiPropertyOptional({
    type: [CourierStateInputDto],
    description:
      "Full replacement of service states when provided (omit to leave unchanged)",
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CourierStateInputDto)
  @ArrayUnique((s: CourierStateInputDto) => s.code)
  states?: CourierStateInputDto[];

  @ApiPropertyOptional({
    type: [CourierRateRuleInputDto],
    description:
      "Full replacement of rate bands when provided (omit to leave unchanged)",
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CourierRateRuleInputDto)
  rateRules?: CourierRateRuleInputDto[];
}
