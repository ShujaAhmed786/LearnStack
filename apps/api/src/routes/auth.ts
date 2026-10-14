import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import * as argon2 from 'argon2';
import { prisma } from 'db';
import { env } from '../env.js';
import { setSessionCookie, clearSessionCookie } from '../plugins/auth.js';
import { generateCode, hashCode, verifyCode } from '../lib/otp.js';
import { sendVerificationEmail } from '../lib/email.js';
import crypto from 'crypto';

export async function authRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // POST /v1/auth/register
  app.post(
    '/register',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
        },
      },
      schema: {
        body: z
          .object({
            email: z.string().email(),
            password: z.string().min(8, 'Password must be at least 8 characters'),
            name: z.string().min(1, 'Name is required'),
            orgSlug: z.string().min(1, 'Organization slug is required'),
          })
          .strict(),
      },
    },
    async (request, reply) => {
      const { email, password, name, orgSlug } = request.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return reply.status(409).send({
          error: {
            message: 'Email already registered',
            code: 'EMAIL_ALREADY_EXISTS',
          },
        });
      }

      // Find or create organization
      let org = await prisma.organization.findUnique({
        where: { slug: orgSlug },
      });

      if (!org) {
        org = await prisma.organization.create({
          data: {
            slug: orgSlug,
            name: orgSlug.charAt(0).toUpperCase() + orgSlug.slice(1),
            primaryColor: '#14B8A6',
          },
        });
      }

      // Hash password using argon2id
      const passwordHash = await argon2.hash(password, {
        type: argon2.argon2id,
      });

      // Create user with emailVerified = false
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
          role: 'LEARNER',
          orgId: org.id,
          emailVerified: false,
        },
      });

      // Generate 6-digit OTP code & store hashed code with 10min expiry
      const code = generateCode();
      const hashed = await hashCode(code);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await prisma.emailVerification.create({
        data: {
          userId: user.id,
          hashedCode: hashed,
          expiresAt,
          attempts: 0,
        },
      });

      // Dispatch verification email
      await sendVerificationEmail(user.email, user.name, code);

      // Do NOT set session cookie yet per Spec 05
      return reply.status(201).send({
        message: 'Verification code sent',
        email: user.email,
      });
    }
  );

  // POST /v1/auth/verify-email
  app.post(
    '/verify-email',
    {
      schema: {
        body: z
          .object({
            email: z.string().email(),
            code: z.string().length(6, 'Code must be exactly 6 digits'),
          })
          .strict(),
      },
    },
    async (request, reply) => {
      const { email, code } = request.body;

      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          org: true,
          emailVerification: true,
        },
      });

      if (!user) {
        return reply.status(400).send({
          error: {
            message: 'Invalid email address',
            code: 'INVALID_CREDENTIALS',
          },
        });
      }

      if (user.emailVerified) {
        // C1: Already verified - do NOT grant session here, require login
        // (prevents account takeover via email enumeration)
        return reply.status(400).send({
          error: {
            message: 'Email already verified. Please log in.',
            code: 'ALREADY_VERIFIED',
          },
        });
      }

      const verification = user.emailVerification;
      if (!verification) {
        return reply.status(400).send({
          error: {
            message: 'No verification request found. Please request a new code.',
            code: 'NO_VERIFICATION_PENDING',
          },
        });
      }

      // Check max attempts
      if (verification.attempts >= 5) {
        return reply.status(400).send({
          error: {
            message: 'Maximum attempts exceeded (5/5). Code invalidated, please request a new code.',
            code: 'MAX_ATTEMPTS_EXCEEDED',
          },
        });
      }

      // Check expiry
      if (new Date() > verification.expiresAt) {
        return reply.status(400).send({
          error: {
            message: 'Verification code has expired. Please request a new code.',
            code: 'CODE_EXPIRED',
          },
        });
      }

      // Verify code
      const isValid = await verifyCode(code, verification.hashedCode);

      if (!isValid) {
        const nextAttempts = verification.attempts + 1;
        await prisma.emailVerification.update({
          where: { id: verification.id },
          data: { attempts: nextAttempts },
        });

        const remaining = Math.max(0, 5 - nextAttempts);
        return reply.status(400).send({
          error: {
            message:
              remaining > 0
                ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
                : 'Maximum attempts exceeded. Please request a new code.',
            code: 'INVALID_CODE',
          },
        });
      }

      // On Success: mark verified & delete verification record
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: true },
        }),
        prisma.emailVerification.delete({
          where: { id: verification.id },
        }),
      ]);

      // Set session cookie
      setSessionCookie(
        reply,
        { userId: user.id, orgId: user.orgId },
        env.NODE_ENV === 'production'
      );

      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          orgId: user.orgId,
          emailVerified: true,
          createdAt: user.createdAt,
        },
        org: {
          id: user.org.id,
          name: user.org.name,
          slug: user.org.slug,
          logoUrl: user.org.logoUrl,
          primaryColor: user.org.primaryColor,
          createdAt: user.org.createdAt,
        },
      });
    }
  );

  // POST /v1/auth/resend-code
  app.post(
    '/resend-code',
    {
      schema: {
        body: z
          .object({
            email: z.string().email(),
          })
          .strict(),
      },
    },
    async (request, reply) => {
      const { email } = request.body;

      const user = await prisma.user.findUnique({
        where: { email },
        include: { emailVerification: true },
      });

      // Anti-enumeration: return identical success message even if email not found
      if (!user) {
        return reply.send({ message: 'If that account exists, a new verification code was sent.' });
      }

      if (user.emailVerified) {
        return reply.send({ message: 'Email is already verified.' });
      }

      // Check 60s cooldown
      if (user.emailVerification) {
        const timeSinceCreated = Date.now() - new Date(user.emailVerification.createdAt).getTime();
        if (timeSinceCreated < 60 * 1000) {
          const waitSeconds = Math.ceil((60 * 1000 - timeSinceCreated) / 1000);
          return reply.status(429).send({
            error: {
              message: `Please wait ${waitSeconds} seconds before requesting another code`,
              code: 'COOLDOWN_ACTIVE',
            },
          });
        }
      }

      // Generate new code, replace old record
      const code = generateCode();
      const hashed = await hashCode(code);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.emailVerification.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          hashedCode: hashed,
          expiresAt,
          attempts: 0,
          createdAt: new Date(),
        },
        update: {
          hashedCode: hashed,
          expiresAt,
          attempts: 0,
          createdAt: new Date(),
        },
      });

      await sendVerificationEmail(user.email, user.name, code);

      return reply.send({ message: 'Verification code sent', email: user.email });
    }
  );

  // POST /v1/auth/login
  app.post(
    '/login',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
      schema: {
        body: z
          .object({
            email: z.string().email(),
            password: z.string().min(1, 'Password is required'),
          })
          .strict(),
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      const user = await prisma.user.findUnique({
        where: { email },
        include: { org: true },
      });

      if (!user) {
        return reply.status(401).send({
          error: {
            message: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS',
          },
        });
      }

      const validPassword = await argon2.verify(user.passwordHash, password);
      if (!validPassword) {
        return reply.status(401).send({
          error: {
            message: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS',
          },
        });
      }

      // Spec 05: Check email verification
      if (!user.emailVerified) {
        return reply.status(403).send({
          error: {
            message: 'Please verify your email before logging in',
            code: 'EMAIL_NOT_VERIFIED',
          },
        });
      }

      // Spec 08: Check if account is active and not deleted
      if (!user.active || user.deletedAt !== null) {
        return reply.status(403).send({
          error: {
            message: 'Your account has been deactivated. Please contact an administrator.',
            code: 'ACCOUNT_DEACTIVATED',
          },
        });
      }

      // Set session cookie
      setSessionCookie(
        reply,
        { userId: user.id, orgId: user.orgId },
        env.NODE_ENV === 'production'
      );

      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          orgId: user.orgId,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
        },
        org: {
          id: user.org.id,
          name: user.org.name,
          slug: user.org.slug,
          logoUrl: user.org.logoUrl,
          primaryColor: user.org.primaryColor,
          createdAt: user.org.createdAt,
        },
      });
    }
  );

  // POST /v1/auth/logout
  app.post('/logout', async (_request, reply) => {
    clearSessionCookie(reply);
    return reply.send({ success: true });
  });

  // GET /v1/auth/me
  app.get(
    '/me',
    {
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const user = request.user!;

      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          orgId: user.orgId,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
        },
        org: {
          id: user.org.id,
          name: user.org.name,
          slug: user.org.slug,
          logoUrl: user.org.logoUrl,
          primaryColor: user.org.primaryColor,
          createdAt: user.org.createdAt,
        },
      });
    }
  );

}

