import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsString, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export class CreateTaxDto {
  @ApiProperty({
    example: "GST 5%",
    description: "Display label for this tax band (e.g. shown on invoices).",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 5,
    description:
      "Percentage rate (0–100). Products reference this row via `taxId` on create/update.",
  })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  percent: number;
}
