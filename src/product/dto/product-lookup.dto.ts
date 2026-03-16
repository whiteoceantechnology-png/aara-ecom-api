import { ApiProperty } from "@nestjs/swagger";
import { IsInt } from "class-validator";
import { Type } from "class-transformer";

export class ProductIdDto {
  @ApiProperty({ example: 7, description: "Product ID" })
  @IsInt()
  @Type(() => Number)
  productId: number;
}
