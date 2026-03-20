import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AdminImagesService } from "./admin-images.service";
import { PrismaService } from "../prisma/prisma.service";
import * as fs from "fs/promises";

jest.mock("fs/promises");

const mockPrisma = {
  uploadedImage: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
};

describe("AdminImagesService", () => {
  let service: AdminImagesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminImagesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AdminImagesService>(AdminImagesService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("upload()", () => {
    it("should throw BadRequestException when no file provided", async () => {
      await expect(service.upload(undefined)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.upload(undefined)).rejects.toThrow(
        "No file provided",
      );
    });

    it("should throw BadRequestException for invalid file type", async () => {
      const file = {
        buffer: Buffer.from("test"),
        originalname: "doc.pdf",
        mimetype: "application/pdf",
        size: 1024,
      } as Express.Multer.File;

      await expect(service.upload(file)).rejects.toThrow(BadRequestException);
      await expect(service.upload(file)).rejects.toThrow("Invalid file type");
    });

    it("should throw BadRequestException for file too large", async () => {
      const file = {
        buffer: Buffer.alloc(6 * 1024 * 1024),
        originalname: "large.jpg",
        mimetype: "image/jpeg",
        size: 6 * 1024 * 1024,
      } as Express.Multer.File;

      await expect(service.upload(file)).rejects.toThrow(BadRequestException);
      await expect(service.upload(file)).rejects.toThrow("File too large");
    });

    it("should upload valid image and return metadata", async () => {
      const file = {
        buffer: Buffer.from("test"),
        originalname: "photo.jpg",
        mimetype: "image/jpeg",
        size: 1024,
      } as Express.Multer.File;

      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      mockPrisma.uploadedImage.create.mockResolvedValue({
        id: 1,
        path: "2026/03/18/12345678-abc12345.jpg",
        originalName: "photo.jpg",
        mimeType: "image/jpeg",
        size: 1024,
        createdAt: new Date(),
      });

      const result = await service.upload(file);

      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
      expect(mockPrisma.uploadedImage.create).toHaveBeenCalled();
      expect(result).toMatchObject({
        id: 1,
        originalName: "photo.jpg",
        mimeType: "image/jpeg",
        size: 1024,
      });
      expect(result.path).toMatch(/^\d{4}\/\d{2}\/\d{2}\/\d+-[a-f0-9]+\.jpg$/);
    });
  });

  describe("getByPath()", () => {
    it("should throw BadRequestException for path traversal", async () => {
      await expect(service.getByPath("../../../etc/passwd")).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getByPath("../../../etc/passwd")).rejects.toThrow(
        "Invalid path",
      );
    });

    it("should throw NotFoundException when record not in DB", async () => {
      mockPrisma.uploadedImage.findUnique.mockResolvedValue(null);

      await expect(service.getByPath("2026/03/18/123.jpg")).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getByPath("2026/03/18/123.jpg")).rejects.toThrow(
        "Image not found: 2026/03/18/123.jpg",
      );
    });

    it("should throw NotFoundException when file missing on disk", async () => {
      mockPrisma.uploadedImage.findUnique.mockResolvedValue({
        id: 1,
        path: "2026/03/18/123.jpg",
        originalName: "photo.jpg",
        mimeType: "image/jpeg",
        size: 1024,
      });
      (fs.readFile as jest.Mock).mockRejectedValue(new Error("ENOENT"));

      await expect(service.getByPath("2026/03/18/123.jpg")).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getByPath("2026/03/18/123.jpg")).rejects.toThrow(
        "Image file not found: 2026/03/18/123.jpg",
      );
    });

    it("should return buffer and metadata when image exists", async () => {
      const buffer = Buffer.from("image-data");
      mockPrisma.uploadedImage.findUnique.mockResolvedValue({
        id: 1,
        path: "2026/03/18/123.jpg",
        originalName: "photo.jpg",
        mimeType: "image/jpeg",
        size: 1024,
      });
      (fs.readFile as jest.Mock).mockResolvedValue(buffer);

      const result = await service.getByPath("2026/03/18/123.jpg");

      expect(result).toEqual({
        buffer,
        mimeType: "image/jpeg",
        originalName: "photo.jpg",
      });
    });

    it("should accept Windows-style paths (backslashes) and normalize to forward slashes", async () => {
      const buffer = Buffer.from("image-data");
      mockPrisma.uploadedImage.findUnique.mockResolvedValue({
        id: 1,
        path: "2026/03/20/1773990762403-cfbcb565.jpeg",
        originalName: "photo.jpeg",
        mimeType: "image/jpeg",
        size: 1024,
      });
      (fs.readFile as jest.Mock).mockResolvedValue(buffer);

      const result = await service.getByPath(
        "2026\\03\\20\\1773990762403-cfbcb565.jpeg",
      );

      expect(mockPrisma.uploadedImage.findUnique).toHaveBeenCalledWith({
        where: { path: "2026/03/20/1773990762403-cfbcb565.jpeg" },
      });
      expect(result).toEqual({
        buffer,
        mimeType: "image/jpeg",
        originalName: "photo.jpeg",
      });
    });
  });
});
