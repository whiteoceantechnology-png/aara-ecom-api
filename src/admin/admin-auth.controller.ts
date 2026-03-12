import { Controller, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from "@nestjs/swagger";
import { AdminAuthService } from "./admin-auth.service";
import { AdminLoginDto, CreateAdminDto } from "./dto/admin-auth.dto";

@ApiTags("Admin — Auth")
@Controller("admin/auth")
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register a new admin account" })
  @ApiBody({ type: CreateAdminDto })
  @ApiResponse({ status: 201, description: "Admin registered" })
  @ApiResponse({ status: 409, description: "Username already exists" })
  register(@Body() dto: CreateAdminDto) {
    return this.adminAuthService.register(dto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Admin login — returns JWT token (8h expiry)" })
  @ApiBody({ type: AdminLoginDto })
  @ApiResponse({ status: 200, description: "Login successful — returns token" })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  login(@Body() dto: AdminLoginDto) {
    return this.adminAuthService.login(dto);
  }
}
