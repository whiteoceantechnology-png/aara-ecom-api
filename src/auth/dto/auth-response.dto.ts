import { ApiProperty } from "@nestjs/swagger";

export class RegisterResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: "john_doe" })
  username: string;
}

export class LoginResponseDto {
  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
  token: string;
}

export class UpdateUserResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: "new_username" })
  username: string;
}

export class MessageResponseDto {
  @ApiProperty({ example: "Operation completed successfully." })
  message: string;
}
