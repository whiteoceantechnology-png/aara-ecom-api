import {
  Controller,
  Post,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { Public } from "./public.decorator";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { ForgotPasswordDto, ResetPasswordDto } from "./dto/forgot-password.dto";
import {
  RegisterResponseDto,
  LoginResponseDto,
  UpdateUserResponseDto,
  MessageResponseDto,
} from "./dto/auth-response.dto";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register a new user" })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: "User registered successfully",
    type: RegisterResponseDto,
  })
  @ApiResponse({ status: 400, description: "Validation failed" })
  @ApiResponse({ status: 409, description: "Username already exists" })
  async register(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
    return this.authService.register(dto);
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login with username and password" })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: "Login successful, returns JWT token",
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 400, description: "Validation failed" })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }

  @Patch("update/:id")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update user username or password by user ID" })
  @ApiParam({ name: "id", type: Number, description: "User ID" })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: "User updated successfully",
    type: UpdateUserResponseDto,
  })
  @ApiResponse({ status: 400, description: "Validation failed" })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiResponse({ status: 409, description: "Username already taken" })
  async updateUser(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ): Promise<UpdateUserResponseDto> {
    return this.authService.updateUser(id, dto);
  }

  @Public()
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Request a password reset token" })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: "Reset token generated (sent via email in production)",
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 400, description: "Validation failed" })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<MessageResponseDto> {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reset password using the reset token" })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: "Password reset successfully",
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid or expired reset token" })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<MessageResponseDto> {
    return this.authService.resetPassword(dto);
  }
}
