import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { CategoriesService } from "../product/categories/categories.service";
import {
  AdminCreateCategoryDto,
  AdminUpdateCategoryDto,
} from "./dto/admin.dto";

@ApiBearerAuth()
@ApiTags("Admin — Categories")
@Controller("admin/categories")
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({
    summary:
      "Get all categories with parent/child relationships and product count",
  })
  findAll() {
    return this.categoriesService.adminFindAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get category detail with products" })
  @ApiParam({ name: "id", type: Number })
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.categoriesService.adminFindOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a category" })
  @ApiBody({ type: AdminCreateCategoryDto })
  @ApiResponse({ status: 201, description: "Category created" })
  create(@Body() dto: AdminCreateCategoryDto) {
    return this.categoriesService.adminCreate(dto);
  }

  @Put(":id")
  @ApiOperation({ summary: "Edit category name, slug or active status" })
  @ApiParam({ name: "id", type: Number })
  @ApiBody({ type: AdminUpdateCategoryDto })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AdminUpdateCategoryDto,
  ) {
    return this.categoriesService.adminUpdate(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a category" })
  @ApiParam({ name: "id", type: Number })
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.categoriesService.adminRemove(id);
  }
}
