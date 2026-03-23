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
  uploadMany: jest.fn(),
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
    it("should upload single file and return array of image metadata", async () => {
      const mockFiles = [
        {
          buffer: Buffer.from("test"),
          originalname: "photo.jpg",
          mimetype: "image/jpeg",
          size: 1024,
        },
      ] as Express.Multer.File[];

      mockAdminImagesService.uploadMany.mockResolvedValue([mockUploadResult]);

      const result = await controller.upload(mockFiles);

      expect(mockAdminImagesService.uploadMany).toHaveBeenCalledWith(mockFiles);
      expect(result).toEqual([mockUploadResult]);
      expect(result).toHaveLength(1);
    });

    it("should upload multiple files and return array of metadata", async () => {
      const mockFiles = [
        {
          buffer: Buffer.from("a"),
          originalname: "a.jpg",
          mimetype: "image/jpeg",
          size: 100,
        },
        {
          buffer: Buffer.from("b"),
          originalname: "b.png",
          mimetype: "image/png",
          size: 200,
        },
      ] as Express.Multer.File[];
      const mockResults = [
        { ...mockUploadResult, id: 1, originalName: "a.jpg" },
        { ...mockUploadResult, id: 2, originalName: "b.png" },
      ];

      mockAdminImagesService.uploadMany.mockResolvedValue(mockResults);

      const result = await controller.upload(mockFiles);

      expect(mockAdminImagesService.uploadMany).toHaveBeenCalledWith(mockFiles);
      expect(result).toEqual(mockResults);
      expect(result).toHaveLength(2);
    });

    it("should throw BadRequestException when no files provided", async () => {
      await expect(controller.upload([])).rejects.toThrow(BadRequestException);
      await expect(controller.upload([])).rejects.toThrow(
        "No files provided. Use form field 'files'.",
      );
    });

    it("should throw BadRequestException when files is undefined", async () => {
      await expect(controller.upload(undefined)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.upload(undefined)).rejects.toThrow(
        "No files provided. Use form field 'files'.",
      );
    });

    it("should throw BadRequestException for invalid file type", async () => {
      const mockFiles = [
        {
          buffer: Buffer.from("test"),
          originalname: "doc.pdf",
          mimetype: "application/pdf",
          size: 1024,
        },
      ] as Express.Multer.File[];

      mockAdminImagesService.uploadMany.mockRejectedValue(
        new BadRequestException("Invalid file type. Allowed: image/jpeg, ..."),
      );

      await expect(controller.upload(mockFiles)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException for file too large", async () => {
      const mockFiles = [
        {
          buffer: Buffer.alloc(6 * 1024 * 1024),
          originalname: "large.jpg",
          mimetype: "image/jpeg",
          size: 6 * 1024 * 1024,
        },
      ] as Express.Multer.File[];

      mockAdminImagesService.uploadMany.mockRejectedValue(
        new BadRequestException("File too large. Max size: 5MB"),
      );

      await expect(controller.upload(mockFiles)).rejects.toThrow(
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
