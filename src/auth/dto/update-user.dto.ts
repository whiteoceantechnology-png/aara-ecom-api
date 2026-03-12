import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class UpdateUserDto {
  @ApiProperty({
    example: "new_username",
    description: "New username",
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  username?: string;

  @ApiProperty({
    example: "NewSecret@123",
    description: "New password (min 6 chars)",
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password?: string;
}
