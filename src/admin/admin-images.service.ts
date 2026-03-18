import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as fs from "fs/promises";
import * as path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "uploads";
const PATH_TRAVERSAL = /\.\.|^\/|\\/;

const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

@Injectable()
export class AdminImagesService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(file: Express.Multer.File) {
    if (!file) throw new BadRequestException("No file provided");

    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${ALLOWED_MIME.join(", ")}`,
      );
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException(
        `File too large. Max size: ${MAX_SIZE_BYTES / 1024 / 1024}MB`,
      );
    }

    const dateDir = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
    const ext = path.extname(file.originalname) || ".bin";
    const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;
    const relativePath = path.join(dateDir, filename);
    const fullPath = path.join(process.cwd(), UPLOAD_DIR, relativePath);

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, file.buffer);

    const record = await this.prisma.uploadedImage.create({
      data: {
        path: relativePath,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
    });

    return {
      id: record.id,
      path: relativePath,
      originalName: record.originalName,
      mimeType: record.mimeType,
      size: record.size,
      createdAt: record.createdAt,
    };
  }

  async getByPath(pathParam: string) {
    if (PATH_TRAVERSAL.test(pathParam)) {
      throw new BadRequestException("Invalid path");
    }

    const record = await this.prisma.uploadedImage.findUnique({
      where: { path: pathParam },
    });
    if (!record) throw new NotFoundException(`Image not found: ${pathParam}`);

    const fullPath = path.join(process.cwd(), UPLOAD_DIR, record.path);
    try {
      const buffer = await fs.readFile(fullPath);
      return {
        buffer,
        mimeType: record.mimeType,
        originalName: record.originalName,
      };
    } catch {
      throw new NotFoundException(`Image file not found: ${pathParam}`);
    }
  }
}
