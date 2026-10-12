import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from 'db';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { env } from '../env.js';
import { generateCertificatePdf } from '../lib/certificate-generator.js';

const CERTIFICATES_DIR = path.resolve(process.cwd(), 'uploads', 'certificates');
if (!fs.existsSync(CERTIFICATES_DIR)) {
  fs.mkdirSync(CERTIFICATES_DIR, { recursive: true });
}

export async function certificateRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  /**
   * POST /v1/courses/:slug/claim-certificate
   * Claim completion certificate for a course
   */
  server.post(
    '/courses/:slug/claim-certificate',
    {
      schema: {
        params: z.object({
          slug: z.string(),
        }),
      },
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
        });
      }

      const { slug } = request.params;
      const userId = request.user.id;
      const orgId = request.user.orgId;

      // Find course
      const course = await prisma.roadmap.findUnique({
        where: { slug },
        include: {
          stages: {
            include: {
              topics: true,
            },
          },
        },
      });

      if (!course) {
        return reply.status(404).send({
          error: { message: 'Course not found', code: 'NOT_FOUND' },
        });
      }

      // Check if certificate already claimed (Return existing certificate, no duplicate creation)
      const existingCert = await prisma.certificate.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: course.id,
          },
        },
      });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { org: true },
      });

      if (!user) {
        return reply.status(404).send({
          error: { message: 'User not found', code: 'NOT_FOUND' },
        });
      }

      const orgName = user.org?.name || 'LearnStack Academy';

      if (existingCert) {
        return reply.send({
          certificate: {
            id: existingCert.id,
            certificateNumber: existingCert.certificateNumber,
            courseId: existingCert.courseId,
            userId: existingCert.userId,
            orgId: existingCert.orgId,
            issuedAt: existingCert.issuedAt,
            pdfUrl: existingCert.pdfUrl || `/v1/certificates/${existingCert.certificateNumber}/pdf`,
            course: {
              title: course.title,
              slug: course.slug,
            },
            user: {
              name: user.name,
              email: user.email,
            },
            org: {
              name: orgName,
            },
          },
          alreadyClaimed: true,
        });
      }

      // Verify all lessons completed
      const allTopics = course.stages.flatMap((s) => s.topics);
      const topicIds = allTopics.map((t) => t.id);

      if (topicIds.length > 0) {
        const completedProgress = await prisma.topicProgress.count({
          where: {
            userId,
            topicId: { in: topicIds },
            completed: true,
          },
        });

        if (completedProgress < topicIds.length) {
          return reply.status(400).send({
            error: {
              message: `You must complete all ${topicIds.length} lessons before claiming your certificate (${completedProgress}/${topicIds.length} completed).`,
              code: 'COURSE_INCOMPLETE',
            },
          });
        }
      }

      // Verify all quizzes passed
      const quizIds = allTopics
        .map((t) => t.quizId)
        .filter((q): q is string => Boolean(q));

      if (quizIds.length > 0) {
        for (const quizId of quizIds) {
          const passedAttempt = await prisma.quizAttempt.findFirst({
            where: {
              quizId,
              userId,
              passed: true,
            },
          });

          if (!passedAttempt) {
            const quiz = await prisma.quiz.findUnique({
              where: { id: quizId },
              select: { title: true },
            });
            return reply.status(400).send({
              error: {
                message: `You must pass the quiz "${quiz?.title || 'Lesson Quiz'}" before claiming your certificate.`,
                code: 'QUIZ_NOT_PASSED',
              },
            });
          }
        }
      }

      // Generate unique certificate number
      const year = new Date().getFullYear();
      const randomSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
      const certificateNumber = `LS-${year}-${randomSuffix}`;
      const verificationUrl = `${env.CORS_ORIGIN}/verify/${certificateNumber}`;
      const issuedAt = new Date();
      const pdfFileName = `${certificateNumber}.pdf`;
      const pdfFilePath = path.join(CERTIFICATES_DIR, pdfFileName);

      // Generate PDF
      const pdfBuffer = await generateCertificatePdf({
        holderName: user.name,
        courseTitle: course.title,
        orgName,
        certificateNumber,
        issuedAt,
        verificationUrl,
      });

      fs.writeFileSync(pdfFilePath, pdfBuffer);

      const pdfUrl = `/v1/certificates/${certificateNumber}/pdf`;

      // Save Certificate in DB
      const cert = await prisma.certificate.create({
        data: {
          userId,
          courseId: course.id,
          orgId: user.orgId || orgId,
          certificateNumber,
          issuedAt,
          pdfUrl,
        },
      });

      return reply.send({
        certificate: {
          id: cert.id,
          certificateNumber: cert.certificateNumber,
          courseId: cert.courseId,
          userId: cert.userId,
          orgId: cert.orgId,
          issuedAt: cert.issuedAt,
          pdfUrl,
          course: {
            title: course.title,
            slug: course.slug,
          },
          user: {
            name: user.name,
            email: user.email,
          },
          org: {
            name: orgName,
          },
        },
        alreadyClaimed: false,
      });
    }
  );

  /**
   * GET /v1/certificates
   * Current user's certificates
   */
  server.get('/certificates', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
      });
    }

    const userId = request.user.id;

    const certs = await prisma.certificate.findMany({
      where: { userId },
      orderBy: { issuedAt: 'desc' },
    });

    const enriched = await Promise.all(
      certs.map(async (c) => {
        const [course, org, user] = await Promise.all([
          prisma.roadmap.findUnique({
            where: { id: c.courseId },
            select: { title: true, slug: true },
          }),
          prisma.organization.findUnique({
            where: { id: c.orgId },
            select: { name: true, logoUrl: true },
          }),
          prisma.user.findUnique({
            where: { id: c.userId },
            select: { name: true, email: true },
          }),
        ]);

        return {
          id: c.id,
          certificateNumber: c.certificateNumber,
          courseId: c.courseId,
          userId: c.userId,
          orgId: c.orgId,
          issuedAt: c.issuedAt,
          pdfUrl: c.pdfUrl || `/v1/certificates/${c.certificateNumber}/pdf`,
          course: course || { title: 'Course', slug: '' },
          user: user || { name: 'Learner', email: '' },
          org: org || { name: 'LearnStack' },
        };
      })
    );

    return reply.send(enriched);
  });

  /**
   * GET /v1/certificates/:number/verify
   * PUBLIC route for verifying certificate
   */
  server.get(
    '/certificates/:number/verify',
    {
      schema: {
        params: z.object({
          number: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { number } = request.params;

      const cert = await prisma.certificate.findUnique({
        where: { certificateNumber: number },
      });

      if (!cert) {
        return reply.status(404).send({
          valid: false,
          message: 'Certificate not found or invalid certificate number',
        });
      }

      const [user, course, org] = await Promise.all([
        prisma.user.findUnique({
          where: { id: cert.userId },
          select: { name: true },
        }),
        prisma.roadmap.findUnique({
          where: { id: cert.courseId },
          select: { title: true, slug: true },
        }),
        prisma.organization.findUnique({
          where: { id: cert.orgId },
          select: { name: true },
        }),
      ]);

      return reply.send({
        valid: true,
        certificateNumber: cert.certificateNumber,
        holderName: user?.name || 'Learner',
        courseTitle: course?.title || 'Course',
        courseSlug: course?.slug || '',
        issuedAt: cert.issuedAt,
        orgName: org?.name || 'LearnStack Academy',
        pdfUrl: cert.pdfUrl || `/v1/certificates/${cert.certificateNumber}/pdf`,
      });
    }
  );

  /**
   * GET /v1/certificates/:number/pdf
   * Download / View certificate PDF
   */
  server.get(
    '/certificates/:number/pdf',
    {
      schema: {
        params: z.object({
          number: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { number } = request.params;

      const cert = await prisma.certificate.findUnique({
        where: { certificateNumber: number },
      });

      if (!cert) {
        return reply.status(404).send({
          error: { message: 'Certificate not found', code: 'NOT_FOUND' },
        });
      }

      const pdfFilePath = path.join(CERTIFICATES_DIR, `${number}.pdf`);

      if (fs.existsSync(pdfFilePath)) {
        const fileStream = fs.createReadStream(pdfFilePath);
        reply.header('Content-Type', 'application/pdf');
        reply.header(
          'Content-Disposition',
          `inline; filename="certificate-${number}.pdf"`
        );
        return reply.send(fileStream);
      }

      // If file not on disk, regenerate on the fly
      const [user, course, org] = await Promise.all([
        prisma.user.findUnique({
          where: { id: cert.userId },
          select: { name: true },
        }),
        prisma.roadmap.findUnique({
          where: { id: cert.courseId },
          select: { title: true },
        }),
        prisma.organization.findUnique({
          where: { id: cert.orgId },
          select: { name: true },
        }),
      ]);

      const buffer = await generateCertificatePdf({
        holderName: user?.name || 'Learner',
        courseTitle: course?.title || 'Course',
        orgName: org?.name || 'LearnStack Academy',
        certificateNumber: cert.certificateNumber,
        issuedAt: cert.issuedAt,
        verificationUrl: `${env.CORS_ORIGIN}/verify/${cert.certificateNumber}`,
      });

      fs.writeFileSync(pdfFilePath, buffer);

      reply.header('Content-Type', 'application/pdf');
      reply.header(
        'Content-Disposition',
        `inline; filename="certificate-${number}.pdf"`
      );
      return reply.send(buffer);
    }
  );
}
