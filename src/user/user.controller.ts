import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { UserService } from "./user.service";
import {
  UserProfileResponseDto,
  AddressResponseDto,
  CreateAddressDto,
  UpdateAddressDto,
} from "./dto/user.dto";

@ApiBearerAuth()
@ApiTags("User")
@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ─── GET /user/:id/details ─────────────────────────────────────────────────

  @Get(":id/details")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get user profile details" })
  @ApiParam({ name: "id", type: Number, description: "User ID" })
  @ApiResponse({
    status: 200,
    description: "User profile details",
    type: UserProfileResponseDto,
  })
  @ApiResponse({ status: 404, description: "Profile not found" })
  async getProfile(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<UserProfileResponseDto> {
    return this.userService.getProfile(id);
  }

  // ─── GET /user/:id/address ─────────────────────────────────────────────────

  @Get(":id/address")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get all addresses for a user" })
  @ApiParam({ name: "id", type: Number, description: "User ID" })
  @ApiResponse({
    status: 200,
    description: "List of user addresses",
    type: [AddressResponseDto],
  })
  async getAddresses(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<AddressResponseDto[]> {
    return this.userService.getAddresses(id);
  }

  // ─── POST /user/:id/address ────────────────────────────────────────────────

  @Post(":id/address")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Add a new address for a user" })
  @ApiParam({ name: "id", type: Number, description: "User ID" })
  @ApiBody({ type: CreateAddressDto })
  @ApiResponse({
    status: 201,
    description: "Address created successfully",
    type: AddressResponseDto,
  })
  @ApiResponse({ status: 400, description: "Validation failed" })
  async createAddress(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreateAddressDto,
  ): Promise<AddressResponseDto> {
    return this.userService.createAddress(id, dto);
  }

  // ─── PATCH /user/:id/address/:addressId ───────────────────────────────────

  @Patch(":id/address/:addressId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Edit an existing address" })
  @ApiParam({ name: "id", type: Number, description: "User ID" })
  @ApiParam({ name: "addressId", type: Number, description: "Address ID" })
  @ApiBody({ type: UpdateAddressDto })
  @ApiResponse({
    status: 200,
    description: "Address updated successfully",
    type: AddressResponseDto,
  })
  @ApiResponse({ status: 404, description: "Address not found" })
  async updateAddress(
    @Param("id", ParseIntPipe) id: number,
    @Param("addressId", ParseIntPipe) addressId: number,
    @Body() dto: UpdateAddressDto,
  ): Promise<AddressResponseDto> {
    return this.userService.updateAddress(id, addressId, dto);
  }

  // ─── DELETE /user/:id/address/:addressId ──────────────────────────────────

  @Delete(":id/address/:addressId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Remove an address" })
  @ApiParam({ name: "id", type: Number, description: "User ID" })
  @ApiParam({ name: "addressId", type: Number, description: "Address ID" })
  @ApiResponse({ status: 200, description: "Address removed successfully" })
  @ApiResponse({ status: 404, description: "Address not found" })
  async removeAddress(
    @Param("id", ParseIntPipe) id: number,
    @Param("addressId", ParseIntPipe) addressId: number,
  ): Promise<{ message: string }> {
    return this.userService.removeAddress(id, addressId);
  }
}
