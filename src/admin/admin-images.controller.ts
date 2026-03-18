import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFile,
  Query,
  BadRequestException,
  StreamableFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
  ApiResponse,
} from "@nestjs/swagger";
import { AdminImagesService } from "./admin-images.service";

@ApiBearerAuth()
@ApiTags("Admin — Images")
@Controller("admin/images")
export class AdminImagesController {
  constructor(private readonly adminImagesService: AdminImagesService) {}

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: "Upload an image (admin only)" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
      },
    },
  })
  @ApiResponse({ status: 201, description: "Image uploaded successfully" })
  @ApiResponse({ status: 400, description: "Invalid file or no file provided" })
  async upload(@UploadedFile() file: Express.Multer.File) {
    return this.adminImagesService.upload(file);
  }

  @Get("serve")
  @ApiOperation({ summary: "Get image by path (admin only)" })
  @ApiQuery({
    name: "path",
    required: true,
    type: String,
    description: "Image path (e.g. 2026/03/18/12345678-abc12345.jpg)",
  })
  @ApiResponse({ status: 200, description: "Image file" })
  @ApiResponse({ status: 404, description: "Image not found" })
  async getByPath(@Query("path") pathParam: string) {
    if (!pathParam)
      throw new BadRequestException("path query parameter is required");
    const { buffer, mimeType } =
      await this.adminImagesService.getByPath(pathParam);
    return new StreamableFile(buffer, { type: mimeType });
  }
}
