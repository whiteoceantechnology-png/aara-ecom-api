import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { TaxService } from "./tax.service";
import { CreateTaxDto } from "../dto/tax.dto";
import { Public } from "../../auth/public.decorator";

@ApiTags("Tax")
@Controller("taxes")
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: "List all tax rates",
    description:
      "Returns every `Tax` row (`id`, `name`, `percent`). Use `id` as **`taxId`** when creating or updating products.",
  })
  @ApiResponse({
    status: 200,
    description:
      "Array of tax rows, ordered by `id`. Each row includes `id`, `name`, `percent`, timestamps.",
  })
  findAll() {
    return this.taxService.findAll();
  }

  @ApiBearerAuth()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create a tax rate",
    description:
      "Master data only. After creation, link products with `taxId` on `POST /products` or admin product APIs.",
  })
  @ApiBody({ type: CreateTaxDto })
  @ApiResponse({ status: 201, description: "Created `Tax` row" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  create(@Body() dto: CreateTaxDto) {
    return this.taxService.create(dto);
  }
}
