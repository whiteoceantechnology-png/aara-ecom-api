import { Controller, Get } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { VariantsService } from "./variants.service";
import { Public } from "../../auth/public.decorator";

/** Public pack-size discovery; mutations live at `POST /admin/variants` (admin JWT). */
@ApiBearerAuth()
@ApiTags("Variants")
@Controller("variants")
export class VariantsController {
  constructor(private readonly variantsService: VariantsService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: "List pack sizes (for packSizeId when creating variants)",
    description:
      "Mutations are under **Admin — Variants**: `POST /admin/variants`, etc.",
  })
  @ApiResponse({ status: 200, description: "Pack sizes and usage hint" })
  listPackSizes() {
    return this.variantsService.listPackSizes();
  }
}
