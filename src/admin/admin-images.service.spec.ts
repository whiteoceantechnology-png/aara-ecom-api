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
    delete: jest.fn(),
  },
};

/** Creates a valid Multer file for testing */
function createMockFile(overrides: Partial<Express.Multer.File> = {}) {
  return {
    buffer: Buffer.from("test"),
    originalname: "photo.jpg",
    mimetype: "image/jpeg",
    size: 1024,
    ...overrides,
  } as Express.Multer.File;
}

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
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("uploadOne()", () => {
    it("should throw BadRequestException when no file provided", async () => {
      await expect(service.uploadOne(undefined)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.uploadOne(undefined)).rejects.toThrow(
        "No file provided",
      );
    });

    it("should throw BadRequestException when file has no buffer", async () => {
      const file = createMockFile({ buffer: Buffer.alloc(0) });

      await expect(service.uploadOne(file)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.uploadOne(file)).rejects.toThrow(
        "File has no content",
      );
    });

    it("should throw BadRequestException for invalid file type", async () => {
      const file = createMockFile({
        originalname: "doc.pdf",
        mimetype: "application/pdf",
      });

      await expect(service.uploadOne(file)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.uploadOne(file)).rejects.toThrow(
        "Invalid file type",
      );
    });

    it("should throw BadRequestException for file too large", async () => {
      const file = createMockFile({
        buffer: Buffer.alloc(6 * 1024 * 1024),
        originalname: "large.jpg",
        size: 6 * 1024 * 1024,
      });

      await expect(service.uploadOne(file)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.uploadOne(file)).rejects.toThrow("File too large");
    });

    it("should accept all allowed MIME types (JPEG, PNG, GIF, WebP, SVG)", async () => {
      const types = [
        ["image/jpeg", "photo.jpg"],
        ["image/png", "photo.png"],
        ["image/gif", "photo.gif"],
        ["image/webp", "photo.webp"],
        ["image/svg+xml", "photo.svg"],
      ] as const;

      for (const [mimetype, originalname] of types) {
        mockPrisma.uploadedImage.create.mockResolvedValue({
          id: 1,
          path: "2026/03/18/x.jpg",
          originalName: originalname,
          mimeType: mimetype,
          size: 1024,
          createdAt: new Date(),
        });

        const result = await service.uploadOne(
          createMockFile({ mimetype, originalname }),
        );
        expect(result.mimeType).toBe(mimetype);
        expect(result.originalName).toBe(originalname);
      }
    });

    it("should upload valid image and return metadata", async () => {
      const file = createMockFile();

      mockPrisma.uploadedImage.create.mockResolvedValue({
        id: 1,
        path: "2026/03/18/12345678-abc12345.jpg",
        originalName: "photo.jpg",
        mimeType: "image/jpeg",
        size: 1024,
        createdAt: new Date(),
      });

      const result = await service.uploadOne(file);

      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
      expect(mockPrisma.uploadedImage.create).toHaveBeenCalled();
      expect(result).toMatchObject({
        id: 1,
        originalName: "photo.jpg",
        mimeType: "image/jpeg",
        size: 1024,
      });
      expect(result.path).toMatch(
        /^\d{4}\/\d{2}\/\d{2}\/\d+-\d+-[a-f0-9]+\.jpg$/,
      );
    });
  });

  describe("uploadMany()", () => {
    it("should upload multiple files and return array of metadata", async () => {
      const files = [
        createMockFile({
          originalname: "photo1.jpg",
          mimetype: "image/jpeg",
        }),
        createMockFile({
          buffer: Buffer.from("test2"),
          originalname: "photo2.png",
          mimetype: "image/png",
          size: 2048,
        }),
      ];

      mockPrisma.uploadedImage.create
        .mockResolvedValueOnce({
          id: 1,
          path: "2026/03/18/111-abc.jpg",
          originalName: "photo1.jpg",
          mimeType: "image/jpeg",
          size: 1024,
          createdAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 2,
          path: "2026/03/18/222-def.png",
          originalName: "photo2.png",
          mimeType: "image/png",
          size: 2048,
          createdAt: new Date(),
        });

      const result = await service.uploadMany(files);

      expect(mockPrisma.uploadedImage.create).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: 1, originalName: "photo1.jpg" });
      expect(result[1]).toMatchObject({ id: 2, originalName: "photo2.png" });
    });

    it("should process files in parallel (Promise.all)", async () => {
      const files = [
        createMockFile({ originalname: "a.jpg" }),
        createMockFile({ originalname: "b.jpg" }),
        createMockFile({ originalname: "c.jpg" }),
      ];
      mockPrisma.uploadedImage.create.mockImplementation((args) =>
        Promise.resolve({
          id: 1,
          path: "2026/03/18/x.jpg",
          originalName: args.data.originalName,
          mimeType: "image/jpeg",
          size: 1024,
          createdAt: new Date(),
        }),
      );

      const result = await service.uploadMany(files);

      expect(result).toHaveLength(3);
      expect(mockPrisma.uploadedImage.create).toHaveBeenCalledTimes(3);
    });

    it("should reject entire batch when one file fails", async () => {
      const files = [
        createMockFile({ originalname: "valid.jpg" }),
        createMockFile({
          originalname: "invalid.pdf",
          mimetype: "application/pdf",
        }),
      ];

      (fs.unlink as jest.Mock).mockResolvedValue(undefined);
      mockPrisma.uploadedImage.create.mockResolvedValue({
        id: 1,
        path: "2026/03/18/valid.jpg",
        originalName: "valid.jpg",
        mimeType: "image/jpeg",
        size: 1024,
        createdAt: new Date(),
      });

      await expect(service.uploadMany(files)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.uploadMany(files)).rejects.toThrow(
        "Invalid file type",
      );

      expect(mockPrisma.uploadedImage.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe("getByPath()", () => {
    it("should throw BadRequestException for empty or whitespace path", async () => {
      await expect(service.getByPath("")).rejects.toThrow(BadRequestException);
      await expect(service.getByPath("")).rejects.toThrow("Path is required");
      await expect(service.getByPath("   ")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException for path traversal", async () => {
      await expect(service.getByPath("../../../etc/passwd")).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getByPath("../../../etc/passwd")).rejects.toThrow(
        "Invalid path",
      );
    });

    it("should throw BadRequestException for absolute path", async () => {
      await expect(service.getByPath("/etc/passwd")).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getByPath("/etc/passwd")).rejects.toThrow(
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

    it("integration: upload then getByPath returns same file", async () => {
      const file = createMockFile({ originalname: "integration.jpg" });
      const uploadedContent = Buffer.from("uploaded-content");
      mockPrisma.uploadedImage.create.mockImplementation(
        (args: {
          data: {
            path: string;
            originalName: string;
            mimeType: string;
            size: number;
          };
        }) =>
          Promise.resolve({
            id: 99,
            path: args.data.path,
            originalName: args.data.originalName,
            mimeType: args.data.mimeType,
            size: args.data.size,
            createdAt: new Date(),
          }),
      );
      mockPrisma.uploadedImage.findUnique.mockImplementation(
        (args: { where: { path: string } }) =>
          args.where.path
            ? Promise.resolve({
                id: 99,
                path: args.where.path,
                originalName: "integration.jpg",
                mimeType: "image/jpeg",
                size: 1024,
              })
            : Promise.resolve(null),
      );
      (fs.readFile as jest.Mock).mockResolvedValue(uploadedContent);

      const uploadResult = await service.uploadOne(file);
      const serveResult = await service.getByPath(uploadResult.path);

      expect(uploadResult.path).toMatch(/^\d{4}\/\d{2}\/\d{2}\//);
      expect(serveResult.buffer).toEqual(uploadedContent);
      expect(serveResult.mimeType).toBe("image/jpeg");
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
