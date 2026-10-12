import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from 'db';
import crypto from 'crypto';
import { requireRole } from '../plugins/auth.js';

export async function liveSessionRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  /**
   * POST /v1/live-sessions
   * Create live session (INSTRUCTOR, ORG_ADMIN, SUPER_ADMIN)
   */
  server.post(
    '/live-sessions',
    {
      preHandler: [requireRole('INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN')],
      schema: {
        body: z.object({
          title: z.string().min(1),
          description: z.string().optional(),
          courseId: z.string().optional(),
          scheduledAt: z.string().or(z.date()),
          durationMinutes: z.number().int().min(15).max(360).default(60),
        }),
      },
    },
    async (request, reply) => {
      const user = request.user!;
      const { title, description, courseId, scheduledAt, durationMinutes } = request.body;

      const orgId = user.orgId;
      const meetingId = `learnstack-${orgId.slice(0, 8)}-${crypto.randomBytes(6).toString('hex')}`;
      const meetingUrl = `https://meet.jit.si/${meetingId}`;

      const session = await prisma.liveSession.create({
        data: {
          title,
          description,
          courseId: courseId || null,
          orgId,
          scheduledAt: new Date(scheduledAt),
          durationMinutes: durationMinutes || 60,
          meetingId,
          meetingUrl,
          status: 'SCHEDULED',
          createdById: user.id,
        },
      });

      return reply.status(201).send(session);
    }
  );

  /**
   * GET /v1/live-sessions
   * List live sessions for current user's org
   */
  server.get(
    '/live-sessions',
    {
      schema: {
        querystring: z.object({
          courseId: z.string().optional(),
          status: z.enum(['SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED']).optional(),
        }),
      },
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
        });
      }

      const { courseId, status } = request.query;
      const user = request.user;
      const isStaff = user.role === 'INSTRUCTOR' || user.role === 'ORG_ADMIN' || user.role === 'SUPER_ADMIN';

      const sessions = await prisma.liveSession.findMany({
        where: {
          orgId: user.orgId,
          ...(courseId ? { courseId } : {}),
          ...(status ? { status } : {}),
        },
        orderBy: { scheduledAt: 'asc' },
      });

      const enriched = await Promise.all(
        sessions.map(async (s) => {
          const [registration, registrationCount, course, instructor] = await Promise.all([
            prisma.sessionRegistration.findUnique({
              where: {
                sessionId_userId: {
                  sessionId: s.id,
                  userId: user.id,
                },
              },
            }),
            prisma.sessionRegistration.count({
              where: { sessionId: s.id },
            }),
            s.courseId
              ? prisma.roadmap.findUnique({
                  where: { id: s.courseId },
                  select: { id: true, title: true, slug: true },
                })
              : null,
            prisma.user.findUnique({
              where: { id: s.createdById },
              select: { id: true, name: true, email: true },
            }),
          ]);

          const isRegistered = Boolean(registration);
          const timeUntilMs = new Date(s.scheduledAt).getTime() - Date.now();
          const canJoin =
            isStaff ||
            s.status === 'LIVE' ||
            (isRegistered && timeUntilMs <= 15 * 60 * 1000);

          return {
            ...s,
            isRegistered,
            canJoin,
            registrationCount,
            course,
            instructor,
            // Conceal raw meetingUrl until join check passes
            meetingUrl: canJoin ? s.meetingUrl : null,
          };
        })
      );

      return reply.send(enriched);
    }
  );

  /**
   * GET /v1/live-sessions/upcoming
   * Upcoming active or scheduled live sessions
   */
  server.get('/live-sessions/upcoming', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
      });
    }

    const user = request.user;
    const isStaff = user.role === 'INSTRUCTOR' || user.role === 'ORG_ADMIN' || user.role === 'SUPER_ADMIN';
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const sessions = await prisma.liveSession.findMany({
      where: {
        orgId: user.orgId,
        scheduledAt: { gte: twoHoursAgo },
        status: { in: ['SCHEDULED', 'LIVE'] },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 10,
    });

    const enriched = await Promise.all(
      sessions.map(async (s) => {
        const [registration, registrationCount, course, instructor] = await Promise.all([
          prisma.sessionRegistration.findUnique({
            where: {
              sessionId_userId: {
                sessionId: s.id,
                userId: user.id,
              },
            },
          }),
          prisma.sessionRegistration.count({
            where: { sessionId: s.id },
          }),
          s.courseId
            ? prisma.roadmap.findUnique({
                where: { id: s.courseId },
                select: { id: true, title: true, slug: true },
              })
            : null,
          prisma.user.findUnique({
            where: { id: s.createdById },
            select: { id: true, name: true, email: true },
          }),
        ]);

        const isRegistered = Boolean(registration);
        const timeUntilMs = new Date(s.scheduledAt).getTime() - Date.now();
        const canJoin =
          isStaff ||
          s.status === 'LIVE' ||
          (isRegistered && timeUntilMs <= 15 * 60 * 1000);

        return {
          ...s,
          isRegistered,
          canJoin,
          registrationCount,
          course,
          instructor,
          meetingUrl: canJoin ? s.meetingUrl : null,
        };
      })
    );

    return reply.send(enriched);
  });

  /**
   * GET /v1/live-sessions/:id
   * Single live session detail
   */
  server.get(
    '/live-sessions/:id',
    {
      schema: {
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
        });
      }

      const { id } = request.params;
      const user = request.user;
      const isStaff = user.role === 'INSTRUCTOR' || user.role === 'ORG_ADMIN' || user.role === 'SUPER_ADMIN';

      const s = await prisma.liveSession.findUnique({
        where: { id },
      });

      if (!s) {
        return reply.status(404).send({
          error: { message: 'Live session not found', code: 'NOT_FOUND' },
        });
      }

      const [registration, registrationCount, course, instructor] = await Promise.all([
        prisma.sessionRegistration.findUnique({
          where: {
            sessionId_userId: {
              sessionId: s.id,
              userId: user.id,
            },
          },
        }),
        prisma.sessionRegistration.count({
          where: { sessionId: s.id },
        }),
        s.courseId
          ? prisma.roadmap.findUnique({
              where: { id: s.courseId },
              select: { id: true, title: true, slug: true },
            })
          : null,
        prisma.user.findUnique({
          where: { id: s.createdById },
          select: { id: true, name: true, email: true },
        }),
      ]);

      const isRegistered = Boolean(registration);
      const timeUntilMs = new Date(s.scheduledAt).getTime() - Date.now();
      const canJoin =
        isStaff ||
        s.status === 'LIVE' ||
        (isRegistered && timeUntilMs <= 15 * 60 * 1000);

      return reply.send({
        ...s,
        isRegistered,
        canJoin,
        registrationCount,
        course,
        instructor,
        meetingUrl: canJoin ? s.meetingUrl : null,
      });
    }
  );

  /**
   * POST /v1/live-sessions/:id/register
   * Register learner for a live session
   */
  server.post(
    '/live-sessions/:id/register',
    {
      schema: {
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
        });
      }

      const { id } = request.params;
      const userId = request.user.id;

      const session = await prisma.liveSession.findUnique({
        where: { id },
      });

      if (!session) {
        return reply.status(404).send({
          error: { message: 'Live session not found', code: 'NOT_FOUND' },
        });
      }

      if (session.status === 'CANCELLED' || session.status === 'ENDED') {
        return reply.status(400).send({
          error: { message: 'This live session is no longer active', code: 'SESSION_INACTIVE' },
        });
      }

      const reg = await prisma.sessionRegistration.upsert({
        where: {
          sessionId_userId: {
            sessionId: id,
            userId,
          },
        },
        create: {
          sessionId: id,
          userId,
        },
        update: {},
      });

      return reply.send({ success: true, registration: reg });
    }
  );

  /**
   * PATCH /v1/live-sessions/:id/status
   * Update status (LIVE when starting, ENDED when done, CANCELLED)
   */
  server.patch(
    '/live-sessions/:id/status',
    {
      preHandler: [requireRole('INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN')],
      schema: {
        params: z.object({
          id: z.string(),
        }),
        body: z.object({
          status: z.enum(['SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED']),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { status } = request.body;

      const session = await prisma.liveSession.findUnique({
        where: { id },
      });

      if (!session) {
        return reply.status(404).send({
          error: { message: 'Live session not found', code: 'NOT_FOUND' },
        });
      }

      const updated = await prisma.liveSession.update({
        where: { id },
        data: { status },
      });

      return reply.send(updated);
    }
  );

  /**
   * GET /v1/live-sessions/:id/join
   * Returns meetingUrl if user is registered or is instructor/admin
   */
  server.get(
    '/live-sessions/:id/join',
    {
      schema: {
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
        });
      }

      const { id } = request.params;
      const user = request.user;
      const isStaff = user.role === 'INSTRUCTOR' || user.role === 'ORG_ADMIN' || user.role === 'SUPER_ADMIN';

      const session = await prisma.liveSession.findUnique({
        where: { id },
      });

      if (!session) {
        return reply.status(404).send({
          error: { message: 'Live session not found', code: 'NOT_FOUND' },
        });
      }

      // Check registration
      const registration = await prisma.sessionRegistration.findUnique({
        where: {
          sessionId_userId: {
            sessionId: id,
            userId: user.id,
          },
        },
      });

      const isRegistered = Boolean(registration);

      // Non-registered learners get 403
      if (!isStaff && !isRegistered) {
        return reply.status(403).send({
          error: {
            message: 'You must register for this live session before joining.',
            code: 'REGISTRATION_REQUIRED',
          },
        });
      }

      // Check timing: allowed if staff, or session is LIVE, or within 15 minutes of start
      const timeUntilStartMs = new Date(session.scheduledAt).getTime() - Date.now();
      const isWithin15Min = timeUntilStartMs <= 15 * 60 * 1000;

      if (!isStaff && session.status !== 'LIVE' && !isWithin15Min) {
        const minutesLeft = Math.ceil(timeUntilStartMs / (60 * 1000));
        return reply.status(400).send({
          error: {
            message: `This live session opens 15 minutes before the start time. Session starts in ${minutesLeft} minutes.`,
            code: 'SESSION_NOT_STARTED',
          },
        });
      }

      return reply.send({
        meetingUrl: session.meetingUrl,
        meetingId: session.meetingId,
        title: session.title,
        status: session.status,
      });
    }
  );
}
