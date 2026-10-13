import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma, Role, GuideCategory } from 'db';
import { requireRole } from '../plugins/auth.js';

const roleEnum = z.enum(['SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR', 'LEARNER']);

const guideCategoryEnum = z.enum([
  'TEAM_COMMUNICATION',
  'DEV_WORKFLOW',
  'REAL_INCIDENTS',
  'COST_CUTTING',
  'AUTOMATION',
  'RELIABILITY',
  'SCALABILITY',
]);

export async function adminRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // All /v1/admin routes require authentication and admin role (ORG_ADMIN or SUPER_ADMIN)
  app.addHook('preHandler', fastify.authenticate);
  app.addHook('preHandler', requireRole('ORG_ADMIN', 'SUPER_ADMIN'));

  // ==========================================
  // 1. DASHBOARD STATS
  // ==========================================
  // GET /v1/admin/stats - { userCount, contentCounts, quizAttempts, recentSignups }
  app.get('/admin/stats', async (request, reply) => {
    const orgId = request.orgId!;
    const isSuperAdmin = request.user!.role === 'SUPER_ADMIN';

    const orgFilter = isSuperAdmin ? {} : { orgId };

    const [userCount, categoriesCount, topicsCount, quizzesCount, quizAttempts, recentSignups] =
      await Promise.all([
        prisma.user.count({
          where: { ...orgFilter, deletedAt: null },
        }),
        prisma.category.count({ where: orgFilter }),
        prisma.topic.count({ where: orgFilter }),
        prisma.quiz.count({ where: orgFilter }),
        prisma.quizAttempt.count({ where: orgFilter }),
        prisma.user.findMany({
          where: { ...orgFilter, deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            active: true,
            emailVerified: true,
            createdAt: true,
            orgId: true,
          },
        }),
      ]);

    return reply.send({
      userCount,
      contentCounts: {
        categories: categoriesCount,
        topics: topicsCount,
        quizzes: quizzesCount,
      },
      quizAttempts,
      recentSignups,
    });
  });

  // ==========================================
  // 2. USER MANAGEMENT
  // ==========================================
  // GET /v1/admin/users?page=&search= - paginated (20/page), search by email/name
  app.get(
    '/admin/users',
    {
      schema: {
        querystring: z.object({
          page: z.coerce.number().min(1).default(1),
          search: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { page, search } = request.query;
      const pageSize = 20;
      const skip = (page - 1) * pageSize;
      const orgId = request.orgId!;
      const isSuperAdmin = request.user!.role === 'SUPER_ADMIN';

      const searchFilter = search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' as const } },
              { name: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {};

      const where = {
        ...(isSuperAdmin ? {} : { orgId }),
        deletedAt: null,
        ...searchFilter,
      };

      const [total, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSize,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            active: true,
            emailVerified: true,
            createdAt: true,
            orgId: true,
          },
        }),
      ]);

      const totalPages = Math.ceil(total / pageSize) || 1;

      return reply.send({
        users,
        total,
        page,
        totalPages,
      });
    }
  );

  // PATCH /v1/admin/users/:id/role - { role }
  app.patch(
    '/admin/users/:id/role',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: z.object({ role: roleEnum }).strict(),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { role } = request.body;
      const currentUser = request.user!;
      const orgId = request.orgId!;

      const targetUser = await prisma.user.findFirst({
        where: {
          id,
          ...(currentUser.role === 'SUPER_ADMIN' ? {} : { orgId }),
          deletedAt: null,
        },
      });

      if (!targetUser) {
        return reply.status(404).send({
          error: { message: 'User not found', code: 'NOT_FOUND' },
        });
      }

      // Hierarchy rules:
      // ORG_ADMIN cannot assign SUPER_ADMIN role (Acceptance Criteria 2)
      if (currentUser.role === 'ORG_ADMIN' && role === 'SUPER_ADMIN') {
        return reply.status(403).send({
          error: {
            message: 'ORG_ADMIN cannot promote users to SUPER_ADMIN',
            code: 'FORBIDDEN',
          },
        });
      }

      // ORG_ADMIN cannot modify SUPER_ADMIN users
      if (targetUser.role === 'SUPER_ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
        return reply.status(403).send({
          error: {
            message: 'Cannot modify a SUPER_ADMIN account',
            code: 'FORBIDDEN',
          },
        });
      }

      const updated = await prisma.user.update({
        where: { id: targetUser.id },
        data: { role: role as Role },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          active: true,
          emailVerified: true,
          orgId: true,
        },
      });

      return reply.send(updated);
    }
  );

  // PATCH /v1/admin/users/:id/status - { active: boolean }
  app.patch(
    '/admin/users/:id/status',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: z.object({ active: z.boolean() }).strict(),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { active } = request.body;
      const currentUser = request.user!;
      const orgId = request.orgId!;

      if (id === currentUser.id) {
        return reply.status(400).send({
          error: {
            message: 'Cannot deactivate your own account',
            code: 'SELF_DEACTIVATION_PROHIBITED',
          },
        });
      }

      const targetUser = await prisma.user.findFirst({
        where: {
          id,
          ...(currentUser.role === 'SUPER_ADMIN' ? {} : { orgId }),
          deletedAt: null,
        },
      });

      if (!targetUser) {
        return reply.status(404).send({
          error: { message: 'User not found', code: 'NOT_FOUND' },
        });
      }

      const updated = await prisma.user.update({
        where: { id: targetUser.id },
        data: { active },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          active: true,
          emailVerified: true,
          orgId: true,
        },
      });

      return reply.send(updated);
    }
  );

  // DELETE /v1/admin/users/:id - soft delete (set deletedAt)
  app.delete(
    '/admin/users/:id',
    {
      schema: {
        params: z.object({ id: z.string() }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const currentUser = request.user!;
      const orgId = request.orgId!;

      if (id === currentUser.id) {
        return reply.status(400).send({
          error: {
            message: 'Cannot delete your own account',
            code: 'SELF_DELETION_PROHIBITED',
          },
        });
      }

      const targetUser = await prisma.user.findFirst({
        where: {
          id,
          ...(currentUser.role === 'SUPER_ADMIN' ? {} : { orgId }),
          deletedAt: null,
        },
      });

      if (!targetUser) {
        return reply.status(404).send({
          error: { message: 'User not found', code: 'NOT_FOUND' },
        });
      }

      await prisma.user.update({
        where: { id: targetUser.id },
        data: {
          deletedAt: new Date(),
          active: false,
        },
      });

      return reply.send({ success: true, message: 'User soft-deleted successfully' });
    }
  );

  // ==========================================
  // 3. ROADMAP MANAGEMENT
  // ==========================================
  // GET /v1/admin/roadmaps - list with stage & topic counts
  app.get('/admin/roadmaps', async (request, reply) => {
    const isSuperAdmin = request.user!.role === 'SUPER_ADMIN';
    const orgId = request.orgId!;

    const roadmaps = await prisma.roadmap.findMany({
      where: isSuperAdmin
        ? {}
        : {
            OR: [{ orgId: null }, { orgId }],
          },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: {
            topics: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return reply.send(roadmaps);
  });

  // POST /v1/admin/roadmaps - create roadmap
  app.post(
    '/admin/roadmaps',
    {
      schema: {
        body: z
          .object({
            title: z.string().min(1),
            slug: z.string().min(1),
            description: z.string().optional(),
            icon: z.string().optional(),
          })
          .strict(),
      },
    },
    async (request, reply) => {
      const { title, slug, description, icon } = request.body;
      const orgId = request.orgId!;

      const existing = await prisma.roadmap.findUnique({ where: { slug } });
      if (existing) {
        return reply.status(409).send({
          error: { message: 'Roadmap with this slug already exists', code: 'SLUG_CONFLICT' },
        });
      }

      const roadmap = await prisma.roadmap.create({
        data: {
          title,
          slug,
          description,
          icon,
          orgId,
        },
        include: { stages: true },
      });

      return reply.status(201).send(roadmap);
    }
  );

  // PATCH /v1/admin/roadmaps/:id - update
  app.patch(
    '/admin/roadmaps/:id',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: z
          .object({
            title: z.string().min(1).optional(),
            slug: z.string().min(1).optional(),
            description: z.string().optional(),
            icon: z.string().optional(),
          })
          .strict(),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const updated = await prisma.roadmap.update({
        where: { id },
        data: request.body,
        include: {
          stages: {
            orderBy: { order: 'asc' },
            include: { topics: { orderBy: { order: 'asc' } } },
          },
        },
      });

      return reply.send(updated);
    }
  );


  // DELETE /v1/admin/roadmaps/:id - cascade delete
  app.delete(
    '/admin/roadmaps/:id',
    {
      schema: {
        params: z.object({ id: z.string() }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      await prisma.roadmap.delete({ where: { id } });
      return reply.send({ success: true });
    }
  );

  // POST /v1/admin/roadmaps/:roadmapId/stages - create stage
  app.post(
    '/admin/roadmaps/:roadmapId/stages',
    {
      schema: {
        params: z.object({ roadmapId: z.string() }),
        body: z
          .object({
            title: z.string().min(1),
            order: z.number().int().default(0),
          })
          .strict(),
      },
    },
    async (request, reply) => {
      const { roadmapId } = request.params;
      const { title, order } = request.body;

      const stage = await prisma.roadmapStage.create({
        data: {
          roadmapId,
          title,
          order,
        },
        include: { topics: true },
      });

      return reply.status(201).send(stage);
    }
  );

  // PATCH /v1/admin/stages/:id - update/reorder stage
  app.patch(
    '/admin/stages/:id',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: z
          .object({
            title: z.string().min(1).optional(),
            order: z.number().int().optional(),
          })
          .strict(),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const updated = await prisma.roadmapStage.update({
        where: { id },
        data: request.body,
        include: { topics: true },
      });

      return reply.send(updated);
    }
  );

  // POST /v1/admin/stages/:stageId/topics - create topic
  app.post(
    '/admin/stages/:stageId/topics',
    {
      schema: {
        params: z.object({ stageId: z.string() }),
        body: z
          .object({
            title: z.string().min(1),
            description: z.string().optional(),
            youtubeUrl: z.string().optional(),
            quizId: z.string().optional().nullable(),
            order: z.number().int().default(0),
          })
          .strict(),
      },
    },
    async (request, reply) => {
      const { stageId } = request.params;
      const topic = await prisma.roadmapTopic.create({
        data: {
          stageId,
          ...request.body,
        },
      });

      return reply.status(201).send(topic);
    }
  );

  // PATCH /v1/admin/topics/:id - update topic
  app.patch(
    '/admin/topics/:id',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: z
          .object({
            title: z.string().min(1).optional(),
            description: z.string().optional(),
            youtubeUrl: z.string().optional(),
            quizId: z.string().optional().nullable(),
            order: z.number().int().optional(),
          })
          .strict(),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const updated = await prisma.roadmapTopic.update({
        where: { id },
        data: request.body,
      });

      return reply.send(updated);
    }
  );

  // DELETE /v1/admin/topics/:id - delete topic
  app.delete(
    '/admin/topics/:id',
    {
      schema: {
        params: z.object({ id: z.string() }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      await prisma.roadmapTopic.delete({ where: { id } });
      return reply.send({ success: true });
    }
  );

  // ==========================================
  // 4. GUIDES CRUD
  // ==========================================
  // GET /v1/admin/guides - all including drafts
  app.get('/admin/guides', async (request, reply) => {
    const isSuperAdmin = request.user!.role === 'SUPER_ADMIN';
    const orgId = request.orgId!;

    const guides = await prisma.guide.findMany({
      where: isSuperAdmin
        ? {}
        : {
            OR: [{ orgId: null }, { orgId }],
          },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send(guides);
  });

  // POST /v1/admin/guides - create
  app.post(
    '/admin/guides',
    {
      schema: {
        body: z
          .object({
            title: z.string().min(1),
            slug: z.string().min(1),
            category: guideCategoryEnum,
            summary: z.string().min(1),
            content: z.string().min(1),
            difficulty: z.string().default('Beginner'),
            readTimeMinutes: z.number().int().default(5),
            published: z.boolean().default(false),
          })
          .strict(),
      },
    },
    async (request, reply) => {
      const orgId = request.orgId!;
      const guide = await prisma.guide.create({
        data: {
          ...request.body,
          category: request.body.category as GuideCategory,
          orgId,
        },
      });

      return reply.status(201).send(guide);
    }
  );

  // PATCH /v1/admin/guides/:id - update
  app.patch(
    '/admin/guides/:id',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: z
          .object({
            title: z.string().min(1).optional(),
            slug: z.string().min(1).optional(),
            category: guideCategoryEnum.optional(),
            summary: z.string().min(1).optional(),
            content: z.string().min(1).optional(),
            difficulty: z.string().optional(),
            readTimeMinutes: z.number().int().optional(),
            published: z.boolean().optional(),
          })
          .strict(),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const updated = await prisma.guide.update({
        where: { id },
        data: {
          ...request.body,
          ...(request.body.category ? { category: request.body.category as GuideCategory } : {}),
        },
      });

      return reply.send(updated);
    }
  );

  // DELETE /v1/admin/guides/:id - delete
  app.delete(
    '/admin/guides/:id',
    {
      schema: {
        params: z.object({ id: z.string() }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      await prisma.guide.delete({ where: { id } });
      return reply.send({ success: true });
    }
  );

  // ==========================================
  // 5. TACTICS CRUD
  // ==========================================
  // GET /v1/admin/tactics - all including drafts
  app.get('/admin/tactics', async (request, reply) => {
    const isSuperAdmin = request.user!.role === 'SUPER_ADMIN';
    const orgId = request.orgId!;

    const tactics = await prisma.tactic.findMany({
      where: isSuperAdmin
        ? {}
        : {
            OR: [{ orgId: null }, { orgId }],
          },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send(tactics);
  });

  // POST /v1/admin/tactics - create
  app.post(
    '/admin/tactics',
    {
      schema: {
        body: z
          .object({
            title: z.string().min(1),
            category: guideCategoryEnum,
            description: z.string().min(1),
            impact: z.string().min(1),
            effort: z.string().min(1),
            savingsEstimate: z.string().optional(),
            published: z.boolean().default(false),
            howToUse: z.string().optional(),
            howToImplement: z.string().optional(),
            whenUseful: z.string().optional(),
          })
          .strict(),
      },
    },
    async (request, reply) => {
      const orgId = request.orgId!;
      const tactic = await prisma.tactic.create({
        data: {
          ...request.body,
          category: request.body.category as GuideCategory,
          orgId,
        },
      });

      return reply.status(201).send(tactic);
    }
  );

  // PATCH /v1/admin/tactics/:id - update
  app.patch(
    '/admin/tactics/:id',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: z
          .object({
            title: z.string().min(1).optional(),
            category: guideCategoryEnum.optional(),
            description: z.string().min(1).optional(),
            impact: z.string().min(1).optional(),
            effort: z.string().min(1).optional(),
            savingsEstimate: z.string().optional(),
            published: z.boolean().optional(),
            howToUse: z.string().optional(),
            howToImplement: z.string().optional(),
            whenUseful: z.string().optional(),
          })
          .strict(),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const updated = await prisma.tactic.update({
        where: { id },
        data: {
          ...request.body,
          ...(request.body.category ? { category: request.body.category as GuideCategory } : {}),
        },
      });

      return reply.send(updated);
    }
  );

  // DELETE /v1/admin/tactics/:id - delete
  app.delete(
    '/admin/tactics/:id',
    {
      schema: {
        params: z.object({ id: z.string() }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      await prisma.tactic.delete({ where: { id } });
      return reply.send({ success: true });
    }
  );

  // ==========================================
  // 6. ORG SETTINGS
  // ==========================================
  // PATCH /v1/admin/org/settings - { name, logoUrl, primaryColor }
  app.patch(
    '/admin/org/settings',
    {
      schema: {
        body: z
          .object({
            name: z.string().min(1).optional(),
            logoUrl: z.string().optional().nullable(),
            primaryColor: z
              .string()
              .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a valid hex color')
              .optional(),
          })
          .strict(),
      },
    },
    async (request, reply) => {
      const orgId = request.orgId!;
      const updatedOrg = await prisma.organization.update({
        where: { id: orgId },
        data: request.body,
      });

      return reply.send(updatedOrg);
    }
  );
}
