import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  UPLOAD_CONSTANTS,
  UPLOAD_DIR,
} from "../common/constants/upload.constants";
import * as fs from "fs/promises";
import * as path from "path";

const PATH_TRAVERSAL = /\.\.|^\//;

/** Normalize path to forward slashes (handles Windows backslashes from frontend) */
function normalizePath(p: string): string {
  return p.replace(/\\/g, "/");
}

/** Sanitize and validate path param from query */
function sanitizePathParam(pathParam: string | undefined): string {
  const trimmed = pathParam?.trim() ?? "";
  if (!trimmed) return "";
  return normalizePath(trimmed);
}

@Injectable()
export class AdminImagesService {
  private readonly logger = new Logger(AdminImagesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upload multiple files in parallel.
   * On partial failure: removes successfully uploaded files from disk and DB,
   * then rethrows so client gets all-or-nothing semantics.
   */
  async uploadMany(files: Express.Multer.File[]) {
    const results = await Promise.allSettled(
      files.map((file, index) => this.uploadOne(file, index)),
    );

    const successful: Awaited<ReturnType<typeof this.uploadOne>>[] = [];
    const failed = results.find((r) => r.status === "rejected");

    if (failed && failed.status === "rejected") {
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (r.status === "fulfilled") {
          successful.push(r.value);
        }
      }
      await this.rollbackUploads(successful);
      throw failed.reason;
    }

    return results
      .filter(
        (
          r,
        ): r is PromiseFulfilledResult<
          Awaited<ReturnType<typeof this.uploadOne>>
        > => r.status === "fulfilled",
      )
      .map((r) => r.value);
  }

  private async rollbackUploads(
    uploaded: { id: number; path: string }[],
  ): Promise<void> {
    for (const { id, path: relativePath } of uploaded) {
      try {
        const fullPath = path.join(process.cwd(), UPLOAD_DIR, relativePath);
        await fs.unlink(fullPath).catch(() => {});
        await this.prisma.uploadedImage.delete({ where: { id } });
      } catch (err) {
        this.logger.warn(
          `Rollback failed for ${relativePath}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  async uploadOne(file: Express.Multer.File, index = 0) {
    if (!file) throw new BadRequestException("No file provided");

    if (!file.buffer?.length) {
      throw new BadRequestException("File has no content");
    }

    const allowedMime: readonly string[] = UPLOAD_CONSTANTS.ALLOWED_MIME_TYPES;
    if (!allowedMime.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${UPLOAD_CONSTANTS.ALLOWED_MIME_TYPES.join(", ")}`,
      );
    }
    if (file.size > UPLOAD_CONSTANTS.MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File too large. Max size: ${UPLOAD_CONSTANTS.MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`,
      );
    }

    const dateDir = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
    const ext = path.extname(file.originalname) || ".bin";
    const uniqueSuffix = `${index}-${crypto.randomUUID().slice(0, 8)}`;
    const filename = `${Date.now()}-${uniqueSuffix}${ext}`;
    const relativePath = `${dateDir}/${filename}`;
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

    this.logger.log(
      `Uploaded ${file.originalname} → ${relativePath} (${file.size} bytes)`,
    );

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
    const normalized = sanitizePathParam(pathParam);
    if (!normalized) {
      throw new BadRequestException("Path is required");
    }
    if (PATH_TRAVERSAL.test(normalized)) {
      throw new BadRequestException("Invalid path");
    }

    const record = await this.prisma.uploadedImage.findUnique({
      where: { path: normalized },
    });
    if (!record) {
      throw new NotFoundException(`Image not found: ${normalized}`);
    }

    const fullPath = path.join(process.cwd(), UPLOAD_DIR, record.path);
    try {
      const buffer = await fs.readFile(fullPath);
      return {
        buffer,
        mimeType: record.mimeType,
        originalName: record.originalName,
      };
    } catch (err) {
      this.logger.warn(
        `File read failed for path ${record.path}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new NotFoundException(`Image file not found: ${normalized}`);
    }
  }
}
