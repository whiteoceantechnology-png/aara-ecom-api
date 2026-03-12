import {
  Controller,
  Get,
  Post,
  Body,
  Param,
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
} from "@nestjs/swagger";
import { CustomersService } from "./customers.service";
import { CreateCustomerDto, CustomerLoginDto } from "../dto/customer.dto";

@ApiTags("Customers")
@Controller("customers")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register a new customer" })
  @ApiBody({ type: CreateCustomerDto })
  @ApiResponse({ status: 201, description: "Customer registered successfully" })
  @ApiResponse({ status: 400, description: "Email already registered" })
  register(@Body() dto: CreateCustomerDto) {
    return this.customersService.register(dto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Customer login — returns JWT token" })
  @ApiBody({ type: CustomerLoginDto })
  @ApiResponse({
    status: 200,
    description: "Login successful, returns JWT token",
  })
  @ApiResponse({ status: 400, description: "Invalid credentials" })
  login(@Body() dto: CustomerLoginDto) {
    return this.customersService.login(dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get customer profile by ID" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Customer profile" })
  @ApiResponse({ status: 404, description: "Customer not found" })
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.customersService.findOne(id);
  }
}
