import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsEmail, IsOptional } from "class-validator";

export class CreateCustomerDto {
  @ApiProperty({ example: "John Doe" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: "john@gmail.com" })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: "9876543210" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: "Secret@123" })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class CustomerLoginDto {
  @ApiProperty({ example: "john@gmail.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "Secret@123" })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class CreateCustomerAddressDto {
  @ApiProperty({ example: "John Doe" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: "9876543210" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: "12 MG Road" })
  @IsString()
  @IsNotEmpty()
  addressLine1: string;

  @ApiPropertyOptional({ example: "Near City Mall" })
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiProperty({ example: "Bengaluru" })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: "Karnataka" })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: "560001" })
  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @ApiProperty({ example: "IN" })
  @IsString()
  @IsNotEmpty()
  country: string;
}

export class UpdateCustomerAddressDto {
  @ApiPropertyOptional({ example: "John Doe" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: "9876543210" })
  @IsOptional()
  @IsString()
  phone?: string | null;

  @ApiPropertyOptional({ example: "12 MG Road" })
  @IsOptional()
  @IsString()
  addressLine1?: string;

  @ApiPropertyOptional({ example: "Near City Mall" })
  @IsOptional()
  @IsString()
  addressLine2?: string | null;

  @ApiPropertyOptional({ example: "Bengaluru" })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: "Karnataka" })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: "560001" })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: "IN" })
  @IsOptional()
  @IsString()
  country?: string;
}
