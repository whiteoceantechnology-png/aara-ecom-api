import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class AdminLoginDto {
  @ApiProperty({ example: "admin" })
  @IsString()
  username: string;

  @ApiProperty({ example: "Admin@123" })
  @IsString()
  @MinLength(6)
  password: string;
}

export class CreateAdminDto {
  @ApiProperty({ example: "admin" })
  @IsString()
  username: string;

  @ApiProperty({ example: "Admin@123" })
  @IsString()
  @MinLength(6)
  password: string;
}
