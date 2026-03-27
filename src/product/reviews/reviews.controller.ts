import {
  Controller,
  Post,
  Delete,
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
  ApiBearerAuth,
} from "@nestjs/swagger";
import { ReviewsService } from "./reviews.service";
import { CreateReviewDto } from "../dto/review.dto";
import { CurrentCustomerId } from "../decorators/current-customer.decorator";

@ApiBearerAuth()
@ApiTags("Reviews")
@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Add a product review (verified purchase: order must be DELIVERED)",
  })
  @ApiBody({ type: CreateReviewDto })
  @ApiResponse({ status: 201, description: "Review created" })
  @ApiResponse({ status: 409, description: "Already reviewed this product" })
  create(
    @CurrentCustomerId() customerId: number,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(customerId, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete own review" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Review deleted" })
  remove(
    @CurrentCustomerId() customerId: number,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.reviewsService.remove(id, customerId);
  }
}
