import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { StreamableFile } from "@nestjs/common";
import { AdminImagesController } from "./admin-images.controller";
import { AdminImagesService } from "./admin-images.service";

const mockUploadResult = {
  id: 1,
  path: "2026/03/18/12345678-abc12345.jpg",
  originalName: "photo.jpg",
  mimeType: "image/jpeg",
  size: 1024,
  createdAt: new Date(),
};

const mockAdminImagesService = {
  upload: jest.fn(),
  getByPath: jest.fn(),
};

describe("AdminImagesController", () => {
  let controller: AdminImagesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminImagesController],
      providers: [
        { provide: AdminImagesService, useValue: mockAdminImagesService },
      ],
    }).compile();

    controller = module.get<AdminImagesController>(AdminImagesController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("upload()", () => {
    it("should upload file and return image metadata", async () => {
      const mockFile = {
        buffer: Buffer.from("test"),
        originalname: "photo.jpg",
        mimetype: "image/jpeg",
        size: 1024,
      } as Express.Multer.File;

      mockAdminImagesService.upload.mockResolvedValue(mockUploadResult);

      const result = await controller.upload(mockFile);

      expect(mockAdminImagesService.upload).toHaveBeenCalledWith(mockFile);
      expect(result).toEqual(mockUploadResult);
    });

    it("should throw BadRequestException when no file provided", async () => {
      mockAdminImagesService.upload.mockRejectedValue(
        new BadRequestException("No file provided"),
      );

      await expect(controller.upload(undefined)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.upload(undefined)).rejects.toThrow(
        "No file provided",
      );
    });

    it("should throw BadRequestException for invalid file type", async () => {
      const mockFile = {
        buffer: Buffer.from("test"),
        originalname: "doc.pdf",
        mimetype: "application/pdf",
        size: 1024,
      } as Express.Multer.File;

      mockAdminImagesService.upload.mockRejectedValue(
        new BadRequestException("Invalid file type. Allowed: image/jpeg, ..."),
      );

      await expect(controller.upload(mockFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException for file too large", async () => {
      const mockFile = {
        buffer: Buffer.alloc(6 * 1024 * 1024),
        originalname: "large.jpg",
        mimetype: "image/jpeg",
        size: 6 * 1024 * 1024,
      } as Express.Multer.File;

      mockAdminImagesService.upload.mockRejectedValue(
        new BadRequestException("File too large. Max size: 5MB"),
      );

      await expect(controller.upload(mockFile)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("getByPath()", () => {
    it("should return StreamableFile when image exists", async () => {
      const buffer = Buffer.from("image-data");
      mockAdminImagesService.getByPath.mockResolvedValue({
        buffer,
        mimeType: "image/jpeg",
        originalName: "photo.jpg",
      });

      const result = await controller.getByPath("2026/03/18/123.jpg");

      expect(mockAdminImagesService.getByPath).toHaveBeenCalledWith(
        "2026/03/18/123.jpg",
      );
      expect(result).toBeInstanceOf(StreamableFile);
    });

    it("should throw BadRequestException when path is missing", async () => {
      await expect(controller.getByPath("")).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getByPath("")).rejects.toThrow(
        "path query parameter is required",
      );
    });

    it("should throw BadRequestException when path is undefined", async () => {
      await expect(controller.getByPath(undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw NotFoundException when image not found", async () => {
      mockAdminImagesService.getByPath.mockRejectedValue(
        new NotFoundException("Image not found: invalid/path.jpg"),
      );

      await expect(controller.getByPath("invalid/path.jpg")).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.getByPath("invalid/path.jpg")).rejects.toThrow(
        "Image not found: invalid/path.jpg",
      );
    });
  });
});
