import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class ForgotPasswordDto {
  @ApiProperty({
    example: "john_doe",
    description: "Username to reset password for",
  })
  @IsString()
  @IsNotEmpty()
  username: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: "abc123token", description: "Reset token received" })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    example: "NewSecret@123",
    description: "New password (min 6 chars)",
  })
  @IsString()
  @IsNotEmpty()
  newPassword: string;
}
