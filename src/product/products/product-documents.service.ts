import {
  BadRequestException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UPLOAD_DIR } from "../../common/constants/upload.constants";
import * as fs from "fs/promises";
import * as path from "path";
import { createReadStream } from "fs";

const DOC_ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_DOC_BYTES = 15 * 1024 * 1024; // 15MB

function normalizeDocumentType(raw: string): "COA" | "MSDS" | "SDS" {
  const t = (raw || "").trim().toUpperCase();
  if (t === "COA") return "COA";
  if (t === "MSDS" || t === "SDS") return t === "SDS" ? "SDS" : "MSDS";
  throw new BadRequestException('documentType must be "COA", "MSDS", or "SDS"');
}

function mapDocument(doc: {
  id: number;
  documentType: string;
  documentTitle: string;
  fileName: string;
  fileType: string;
}) {
  return {
    id: doc.id,
    documentType: doc.documentType,
    documentTitle: doc.documentTitle,
    fileName: doc.fileName,
    fileType: doc.fileType,
    fileUrl: `/products/documents/${doc.id}/file`,
  };
}

@Injectable()
export class ProductDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listByProduct(productId: number) {
    await this.requireProduct(productId);
    const rows = await this.prisma.productDocument.findMany({
      where: { productId },
      orderBy: [{ documentType: "asc" }, { id: "desc" }],
    });
    return rows.map(mapDocument);
  }

  async create(
    productId: number,
    input: { documentType: string; documentTitle: string },
    file: Express.Multer.File,
  ) {
    await this.requireProduct(productId);
    const documentType = normalizeDocumentType(input.documentType);
    const documentTitle = (input.documentTitle || "").trim();
    if (!documentTitle) {
      throw new BadRequestException("documentTitle is required");
    }
    this.assertUpload(file);

    const relativePath = await this.persistFile(file);
    const created = await this.prisma.productDocument.create({
      data: {
        productId,
        documentType,
        documentTitle,
        fileName: file.originalname,
        fileType: file.mimetype,
        filePath: relativePath,
      },
    });
    return mapDocument(created);
  }

  async update(
    productId: number,
    documentId: number,
    input: { documentType?: string; documentTitle?: string },
    file?: Express.Multer.File,
  ) {
    const existing = await this.requireDocument(productId, documentId);
    const data: {
      documentType?: string;
      documentTitle?: string;
      fileName?: string;
      fileType?: string;
      filePath?: string;
    } = {};

    if (input.documentType != null && input.documentType !== "") {
      data.documentType = normalizeDocumentType(input.documentType);
    }
    if (input.documentTitle != null && input.documentTitle.trim() !== "") {
      data.documentTitle = input.documentTitle.trim();
    }

    let oldPath: string | null = null;
    if (file) {
      this.assertUpload(file);
      oldPath = existing.filePath;
      data.filePath = await this.persistFile(file);
      data.fileName = file.originalname;
      data.fileType = file.mimetype;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        "Provide documentType, documentTitle, and/or a new document file",
      );
    }

    const updated = await this.prisma.productDocument.update({
      where: { id: documentId },
      data,
    });

    if (oldPath) {
      await this.safeUnlink(oldPath);
    }

    return mapDocument(updated);
  }

  async remove(productId: number, documentId: number) {
    const existing = await this.requireDocument(productId, documentId);
    await this.prisma.productDocument.delete({ where: { id: documentId } });
    await this.safeUnlink(existing.filePath);
    return { message: `Document #${documentId} deleted` };
  }

  async getFileStream(documentId: number): Promise<{
    file: StreamableFile;
    fileName: string;
    fileType: string;
  }> {
    const doc = await this.prisma.productDocument.findUnique({
      where: { id: documentId },
    });
    if (!doc) throw new NotFoundException(`Document #${documentId} not found`);

    const fullPath = path.join(process.cwd(), UPLOAD_DIR, doc.filePath);
    try {
      await fs.access(fullPath);
    } catch {
      throw new NotFoundException(`Document file missing on disk`);
    }

    const stream = createReadStream(fullPath);
    return {
      file: new StreamableFile(stream, {
        type: doc.fileType,
        disposition: `inline; filename="${doc.fileName.replace(/"/g, "")}"`,
      }),
      fileName: doc.fileName,
      fileType: doc.fileType,
    };
  }

  private assertUpload(file: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException("document file is required (PDF or image)");
    }
    if (!DOC_ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        "Invalid file type. Allowed: PDF, JPEG, PNG, WEBP, GIF",
      );
    }
    if (file.size > MAX_DOC_BYTES) {
      throw new BadRequestException("File too large (max 15MB)");
    }
  }

  private async persistFile(file: Express.Multer.File): Promise<string> {
    const dateDir = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
    const ext = path.extname(file.originalname) || ".bin";
    const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;
    const relativePath = `documents/${dateDir}/${filename}`;
    const fullPath = path.join(process.cwd(), UPLOAD_DIR, relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, file.buffer);
    return relativePath;
  }

  private async safeUnlink(relativePath: string) {
    try {
      await fs.unlink(path.join(process.cwd(), UPLOAD_DIR, relativePath));
    } catch {
      // ignore missing file
    }
  }

  private async requireProduct(productId: number) {
    const p = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!p) throw new NotFoundException(`Product #${productId} not found`);
    return p;
  }

  private async requireDocument(productId: number, documentId: number) {
    const doc = await this.prisma.productDocument.findFirst({
      where: { id: documentId, productId },
    });
    if (!doc) {
      throw new NotFoundException(
        `Document #${documentId} not found for product #${productId}`,
      );
    }
    return doc;
  }
}
