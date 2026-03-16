import {
  Controller,
  Get,
  Post,
  Put,
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
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto, UpdateCategoryDto } from "../dto/category.dto";
import { Public } from "../../auth/public.decorator";

@ApiBearerAuth()
@ApiTags("Categories")
@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Get all categories" })
  @ApiResponse({ status: 200, description: "List of categories" })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Public()
  @Get(":id/products")
  @ApiOperation({ summary: "Get products by category ID" })
  @ApiParam({ name: "id", type: Number, description: "Category ID" })
  @ApiResponse({ status: 200, description: "Products in this category" })
  @ApiResponse({ status: 404, description: "Category not found" })
  findProductsByCategory(@Param("id", ParseIntPipe) id: number) {
    return this.categoriesService.findProductsByCategory(id);
  }

  @Public()
  @Get(":id")
  @ApiOperation({ summary: "Get category by ID" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Category found" })
  @ApiResponse({ status: 404, description: "Category not found" })
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new category" })
  @ApiBody({ type: CreateCategoryDto })
  @ApiResponse({ status: 201, description: "Category created" })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a category" })
  @ApiParam({ name: "id", type: Number })
  @ApiBody({ type: UpdateCategoryDto })
  @ApiResponse({ status: 200, description: "Category updated" })
  @ApiResponse({ status: 404, description: "Category not found" })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a category" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Category deleted" })
  @ApiResponse({ status: 404, description: "Category not found" })
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.categoriesService.remove(id);
  }
}
