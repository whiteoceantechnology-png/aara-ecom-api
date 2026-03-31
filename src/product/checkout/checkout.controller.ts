import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiHeader,
} from "@nestjs/swagger";
import { CheckoutService } from "./checkout.service";
import { ApplyCouponDto, PlaceOrderDto } from "../dto/checkout.dto";
import { CurrentCustomerId } from "../decorators/current-customer.decorator";

@ApiBearerAuth()
@ApiTags("Checkout")
@Controller("checkout")
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Get("summary")
  @ApiOperation({
    summary:
      "Checkout summary — server-calculated prices, tax, shipping, coupon",
  })
  @ApiResponse({ status: 200, description: "Pricing breakdown" })
  getSummary(@CurrentCustomerId() customerId: number) {
    return this.checkoutService.getSummary(customerId);
  }

  @Post("apply-coupon")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Apply a coupon to the checkout session (24h TTL)" })
  @ApiBody({ type: ApplyCouponDto })
  @ApiResponse({ status: 200, description: "Coupon stored for checkout" })
  @ApiResponse({ status: 400, description: "Invalid coupon" })
  applyCoupon(
    @CurrentCustomerId() customerId: number,
    @Body() dto: ApplyCouponDto,
  ) {
    return this.checkoutService.applyCoupon(customerId, dto);
  }

  @Post("place-order")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      "Place order — idempotent with Idempotency-Key header; reserves stock until payment (non-COD)",
  })
  @ApiHeader({
    name: "idempotency-key",
    required: false,
    description:
      "Stable key for safe retries (same customer + key returns same order)",
  })
  @ApiBody({ type: PlaceOrderDto })
  @ApiResponse({ status: 201, description: "Order created" })
  placeOrder(
    @CurrentCustomerId() customerId: number,
    @Body() dto: PlaceOrderDto,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    return this.checkoutService.placeOrder(customerId, dto, idempotencyKey);
  }
}
