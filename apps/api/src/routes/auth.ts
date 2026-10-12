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
        // Already verified: set session and return user
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

  /**
   * Helper function to match/create user for SSO OAuth (Spec 16)
   * 1. If OAuthAccount exists -> log them in
   * 2. Else if user with this email exists -> link OAuthAccount, log in
   * 3. Else -> create new user (LEARNER role, emailVerified=true), link OAuthAccount, log in
   */
  async function handleOAuthUser({
    provider,
    providerId,
    email,
    name,
  }: {
    provider: 'google' | 'microsoft';
    providerId: string;
    email: string;
    name: string;
  }) {
    // 1. Check existing OAuthAccount
    const existingAccount = await prisma.oAuthAccount.findUnique({
      where: {
        provider_providerId: {
          provider,
          providerId,
        },
      },
      include: {
        user: {
          include: { org: true },
        },
      },
    });

    if (existingAccount) {
      return existingAccount.user;
    }

    // 2. Check existing user by email -> link OAuth account
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: { org: true },
    });

    if (existingUser) {
      await prisma.oAuthAccount.create({
        data: {
          userId: existingUser.id,
          provider,
          providerId,
        },
      });

      // OAuth verified the user's email
      if (!existingUser.emailVerified) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { emailVerified: true },
        });
      }

      return existingUser;
    }

    // 3. Create new user
    let defaultOrg = await prisma.organization.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (!defaultOrg) {
      defaultOrg = await prisma.organization.create({
        data: {
          name: 'LearnStack Academy',
          slug: 'learnstack',
        },
      });
    }

    const randomPassword = crypto.randomBytes(24).toString('hex');
    const passwordHash = await argon2.hash(randomPassword);

    const newUser = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        passwordHash,
        role: 'LEARNER',
        emailVerified: true,
        orgId: defaultOrg.id,
        oauthAccounts: {
          create: {
            provider,
            providerId,
          },
        },
      },
      include: { org: true },
    });

    return newUser;
  }

  // ==========================================
  // Google OAuth Routes
  // ==========================================

  // GET /v1/auth/google
  app.get('/google', async (request, reply) => {
    const callbackUrl = `${env.OAUTH_CALLBACK_URL || 'http://localhost:3001'}/v1/auth/google/callback`;

    if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
        env.GOOGLE_CLIENT_ID
      )}&redirect_uri=${encodeURIComponent(
        callbackUrl
      )}&response_type=code&scope=openid%20profile%20email&prompt=select_account`;
      return reply.redirect(googleAuthUrl);
    }

    // Development fallback simulation (when real Google credentials are not yet configured in env)
    const simulatedUser = await handleOAuthUser({
      provider: 'google',
      providerId: 'google-dev-learner-sub-101',
      email: 'learner.google@learnstack.io',
      name: 'Google Learner',
    });

    setSessionCookie(
      reply,
      { userId: simulatedUser.id, orgId: simulatedUser.orgId },
      env.NODE_ENV === 'production'
    );

    return reply.redirect(`${env.CORS_ORIGIN}/dashboard`);
  });

  // GET /v1/auth/google/callback
  app.get(
    '/google/callback',
    {
      schema: {
        querystring: z.object({
          code: z.string().optional(),
          error: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { code, error } = request.query;

      if (error || !code) {
        return reply.redirect(`${env.CORS_ORIGIN}/login?error=oauth_cancelled`);
      }

      try {
        const callbackUrl = `${env.OAUTH_CALLBACK_URL || 'http://localhost:3001'}/v1/auth/google/callback`;

        // Exchange authorization code for token
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            redirect_uri: callbackUrl,
            grant_type: 'authorization_code',
          }),
        });

        const tokenData = (await tokenRes.json()) as any;
        if (!tokenData.access_token) {
          throw new Error(tokenData.error_description || 'Failed to exchange token');
        }

        // Fetch user profile
        const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        const profile = (await userRes.json()) as any;
        if (!profile.email) {
          throw new Error('Google did not return an email address');
        }

        const user = await handleOAuthUser({
          provider: 'google',
          providerId: profile.sub,
          email: profile.email.toLowerCase(),
          name: profile.name || profile.given_name || profile.email.split('@')[0],
        });

        setSessionCookie(
          reply,
          { userId: user.id, orgId: user.orgId },
          env.NODE_ENV === 'production'
        );

        return reply.redirect(`${env.CORS_ORIGIN}/dashboard`);
      } catch (err: any) {
        request.log.error(err, 'Google OAuth callback error');
        return reply.redirect(`${env.CORS_ORIGIN}/login?error=oauth_failed`);
      }
    }
  );

  // ==========================================
  // Microsoft OAuth Routes
  // ==========================================

  // GET /v1/auth/microsoft
  app.get('/microsoft', async (request, reply) => {
    const callbackUrl = `${env.OAUTH_CALLBACK_URL || 'http://localhost:3001'}/v1/auth/microsoft/callback`;

    if (env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET) {
      const msAuthUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${encodeURIComponent(
        env.MICROSOFT_CLIENT_ID
      )}&redirect_uri=${encodeURIComponent(
        callbackUrl
      )}&response_type=code&scope=openid%20profile%20email%20User.Read`;
      return reply.redirect(msAuthUrl);
    }

    // Development fallback simulation (when real Microsoft credentials are not yet configured in env)
    const simulatedUser = await handleOAuthUser({
      provider: 'microsoft',
      providerId: 'microsoft-dev-learner-sub-202',
      email: 'learner.microsoft@learnstack.io',
      name: 'Microsoft Learner',
    });

    setSessionCookie(
      reply,
      { userId: simulatedUser.id, orgId: simulatedUser.orgId },
      env.NODE_ENV === 'production'
    );

    return reply.redirect(`${env.CORS_ORIGIN}/dashboard`);
  });

  // GET /v1/auth/microsoft/callback
  app.get(
    '/microsoft/callback',
    {
      schema: {
        querystring: z.object({
          code: z.string().optional(),
          error: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { code, error } = request.query;

      if (error || !code) {
        return reply.redirect(`${env.CORS_ORIGIN}/login?error=oauth_cancelled`);
      }

      try {
        const callbackUrl = `${env.OAUTH_CALLBACK_URL || 'http://localhost:3001'}/v1/auth/microsoft/callback`;

        // Exchange authorization code for token
        const tokenRes = await fetch(
          'https://login.microsoftonline.com/common/oauth2/v2.0/token',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              code,
              client_id: env.MICROSOFT_CLIENT_ID,
              client_secret: env.MICROSOFT_CLIENT_SECRET,
              redirect_uri: callbackUrl,
              grant_type: 'authorization_code',
            }),
          }
        );

        const tokenData = (await tokenRes.json()) as any;
        if (!tokenData.access_token) {
          throw new Error(tokenData.error_description || 'Failed to exchange Microsoft token');
        }

        // Fetch Microsoft Graph profile
        const userRes = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        const profile = (await userRes.json()) as any;
        const email = (profile.mail || profile.userPrincipalName || '').toLowerCase();
        if (!email) {
          throw new Error('Microsoft did not return an email address');
        }

        const user = await handleOAuthUser({
          provider: 'microsoft',
          providerId: profile.id,
          email,
          name: profile.displayName || email.split('@')[0],
        });

        setSessionCookie(
          reply,
          { userId: user.id, orgId: user.orgId },
          env.NODE_ENV === 'production'
        );

        return reply.redirect(`${env.CORS_ORIGIN}/dashboard`);
      } catch (err: any) {
        request.log.error(err, 'Microsoft OAuth callback error');
        return reply.redirect(`${env.CORS_ORIGIN}/login?error=oauth_failed`);
      }
    }
  );
}

