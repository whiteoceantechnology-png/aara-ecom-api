import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

// ─── Profile ─────────────────────────────────────────────────────────────────

export class UserProfileResponseDto {
  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: 'john@gmail.com' })
  emailAddress: string;

  @ApiProperty({ example: '10-10-2000' })
  birthDate: string;
}

// ─── Address DTOs ─────────────────────────────────────────────────────────────

export class CreateAddressDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '22/34' })
  @IsString()
  @IsNotEmpty()
  houseNo: string;

  @ApiProperty({ example: 'Nehru Street' })
  @IsString()
  @IsNotEmpty()
  areaStreet: string;

  @ApiProperty({ example: 'Erode' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'Tamil Nadu' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: '638105' })
  @IsString()
  @IsNotEmpty()
  pincode: string;

  @ApiProperty({ example: 'India' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiPropertyOptional({ example: true, description: 'Set as default address' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isDefault?: boolean;
}

export class UpdateAddressDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '22/34' })
  @IsOptional()
  @IsString()
  houseNo?: string;

  @ApiPropertyOptional({ example: 'Nehru Street' })
  @IsOptional()
  @IsString()
  areaStreet?: string;

  @ApiPropertyOptional({ example: 'Erode' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Tamil Nadu' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: '638105' })
  @IsOptional()
  @IsString()
  pincode?: string;

  @ApiPropertyOptional({ example: 'India' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isDefault?: boolean;
}

export class AddressResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: '22/34' })
  houseNo: string;

  @ApiProperty({ example: 'Nehru Street' })
  areaStreet: string;

  @ApiProperty({ example: 'Erode' })
  city: string;

  @ApiProperty({ example: 'Tamil Nadu' })
  state: string;

  @ApiProperty({ example: '638105' })
  pincode: string;

  @ApiProperty({ example: 'India' })
  country: string;

  @ApiProperty({ example: 'yes', enum: ['yes', 'no'] })
  default: string;
}
