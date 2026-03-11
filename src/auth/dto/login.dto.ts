import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'john_doe', description: 'Your username' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'Secret@123', description: 'Your password' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
