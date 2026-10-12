import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from 'db';
import { requireRole } from '../plugins/auth.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_EXTENSIONS = new Set(['pdf', 'pptx', 'docx', 'mp4', 'webm']);

function verifyMagicBytes(buffer: Buffer, ext: string): boolean {
  if (buffer.length < 4) return false;

  if (ext === 'pdf') {
    // %PDF- => 0x25 0x50 0x44 0x46
    return (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    );
  }

  if (ext === 'docx' || ext === 'pptx') {
    // ZIP header: PK\x03\x04 => 0x50 0x4B 0x03 0x04
    return (
      buffer[0] === 0x50 &&
      buffer[1] === 0x4B &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04
    );
  }

  if (ext === 'webm') {
    // EBML container: 0x1A 0x45 0xDF 0xA3
    return (
      buffer[0] === 0x1a &&
      buffer[1] === 0x45 &&
      buffer[2] === 0xdf &&
      buffer[3] === 0xa3
    );
  }

  if (ext === 'mp4') {
    // MP4 contains 'ftyp' at bytes 4..8
    if (buffer.length >= 12) {
      const ftyp = buffer.toString('ascii', 4, 8);
      if (ftyp === 'ftyp') return true;
    }
    // Or starts with 0x00 0x00 0x00
    return buffer[0] === 0x00 && buffer[1] === 0x00;
  }

  return false;
}

export async function uploadRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // POST /v1/upload (ORG_ADMIN, INSTRUCTOR)
  app.post(
    '/upload',
    {
      preHandler: [fastify.authenticate, requireRole('ORG_ADMIN', 'INSTRUCTOR')],
    },
    async (request, reply) => {
      let data;
      try {
        data = await request.file({
          limits: {
            fileSize: 100 * 1024 * 1024, // 100MB
          },
        });
      } catch (err: unknown) {
        return reply.status(400).send({
          error: {
            message: 'Failed to parse file upload',
            code: 'UPLOAD_PARSE_ERROR',
          },
        });
      }

      if (!data) {
        return reply.status(400).send({
          error: {
            message: 'No file provided',
            code: 'NO_FILE',
          },
        });
      }

      const originalName = data.filename || 'uploaded-file';
      const ext = path.extname(originalName).toLowerCase().replace('.', '');

      // 1. Check Extension Allowlist
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        return reply.status(400).send({
          error: {
            message: `File type .${ext} is not allowed. Supported formats: PDF, PPTX, DOCX, MP4, WEBM`,
            code: 'INVALID_FILE_TYPE',
          },
        });
      }

      // Buffer file in memory / check size
      const chunks: Buffer[] = [];
      let totalSize = 0;

      for await (const chunk of data.file) {
        totalSize += chunk.length;
        if (totalSize > 100 * 1024 * 1024) {
          return reply.status(413).send({
            error: {
              message: 'File size exceeds maximum allowed limit (100MB)',
              code: 'FILE_TOO_LARGE',
            },
          });
        }
        chunks.push(chunk);
      }

      const fileBuffer = Buffer.concat(chunks);

      // 2. Magic Byte Verification
      if (!verifyMagicBytes(fileBuffer, ext)) {
        return reply.status(400).send({
          error: {
            message: 'File content does not match allowed format',
            code: 'INVALID_FILE_CONTENT',
          },
        });
      }

      // 3. Generate random safe filename (crypto random hex + extension)
      const randomFilename = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
      const targetPath = path.join(UPLOADS_DIR, randomFilename);

      await fs.promises.writeFile(targetPath, fileBuffer);

      // 4. Save to database for tenant isolation
      const uploadedFile = await prisma.uploadedFile.create({
        data: {
          filename: randomFilename,
          originalName,
          mimeType: data.mimetype || `application/${ext}`,
          sizeBytes: totalSize,
          orgId: request.orgId!,
        },
      });

      return reply.status(201).send({
        url: `/v1/files/${uploadedFile.filename}`,
        name: uploadedFile.originalName,
        mimeType: uploadedFile.mimeType,
        sizeBytes: uploadedFile.sizeBytes,
      });
    }
  );

  // GET /v1/files/:filename - requires auth + orgId match, streams file
  app.get(
    '/files/:filename',
    {
      preHandler: fastify.authenticate,
      schema: {
        params: z.object({ filename: z.string() }).strict(),
      },
    },
    async (request, reply) => {
      const { filename } = request.params;

      // Prevent directory traversal
      const safeFilename = path.basename(filename);
      const filePath = path.join(UPLOADS_DIR, safeFilename);

      if (!fs.existsSync(filePath)) {
        return reply.status(404).send({
          error: {
            message: 'File not found',
            code: 'NOT_FOUND',
          },
        });
      }

      // Check tenant isolation in DB
      const fileRecord = await prisma.uploadedFile.findUnique({
        where: { filename: safeFilename },
      });

      if (!fileRecord || fileRecord.orgId !== request.orgId!) {
        return reply.status(403).send({
          error: {
            message: 'Access to this file is forbidden for your organization',
            code: 'FORBIDDEN',
          },
        });
      }

      const stat = await fs.promises.stat(filePath);
      const stream = fs.createReadStream(filePath);

      reply.header('Content-Type', fileRecord.mimeType);
      reply.header('Content-Length', stat.size);
      reply.header(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(fileRecord.originalName)}"`
      );

      return reply.send(stream);
    }
  );
}
