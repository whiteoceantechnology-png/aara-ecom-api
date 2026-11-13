import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFiles,
  Param,
  Query,
  BadRequestException,
  StreamableFile,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from "@nestjs/swagger";
import { AdminImagesService } from "./admin-images.service";
import { UPLOAD_CONSTANTS } from "../common/constants/upload.constants";
import { Public } from "../auth/public.decorator";

@ApiBearerAuth()
@ApiTags("Admin — Images")
@Controller("admin/images")
export class AdminImagesController {
  constructor(private readonly adminImagesService: AdminImagesService) {}

  @Post("upload")
  @UseInterceptors(
    FilesInterceptor("files", UPLOAD_CONSTANTS.MAX_FILES_PER_REQUEST, {
      limits: { fileSize: UPLOAD_CONSTANTS.MAX_FILE_SIZE_BYTES },
    }),
  )
  @ApiOperation({
    summary: "Upload one or more images (admin only)",
    description:
      "Accepts 1–20 image files. Use form field name 'files' for multiple uploads.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: { type: "string", format: "binary" },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: "Images uploaded successfully" })
  @ApiResponse({
    status: 400,
    description: "Invalid file or no files provided",
  })
  async upload(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files?.length)
      throw new BadRequestException(
        "No files provided. Use form field 'files'.",
      );
    return this.adminImagesService.uploadMany(files);
  }

  @Get("*")
  @Public()
  @ApiOperation({ summary: "Get image by path (public)" })
  @ApiParam({
    name: "0",
    required: true,
    type: String,
    description: "Image path (e.g. 2026/03/18/12345678-abc12345.jpg)",
  })
  @ApiQuery({
    name: "path",
    required: false,
    type: String,
    description:
      "Legacy form: /admin/images/serve?path=2026/03/18/12345678-abc12345.jpg",
  })
  @ApiResponse({ status: 200, description: "Image file" })
  @ApiResponse({ status: 404, description: "Image not found" })
  async getByPath(
    @Param("0") pathParam: string,
    @Query("path") queryPath?: string,
  ) {
    // Supports both the direct wildcard path (/admin/images/2026/..) and the
    // legacy ?path= query form (/admin/images/serve?path=2026/..) still used
    // by toImageUrl()/toAbsoluteImageUrl() across the app (products, wishlist,
    // order tracking, emails).
    const resolvedPath = queryPath || pathParam;
    if (!resolvedPath)
      throw new BadRequestException("path query parameter is required");
    const { buffer, mimeType } =
      await this.adminImagesService.getByPath(resolvedPath);
    return new StreamableFile(buffer, { type: mimeType });
  }
}
