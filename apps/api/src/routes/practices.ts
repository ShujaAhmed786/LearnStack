import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma, GuideCategory } from 'db';

const categoryEnum = z.enum([
  'TEAM_COMMUNICATION',
  'DEV_WORKFLOW',
  'REAL_INCIDENTS',
  'COST_CUTTING',
  'AUTOMATION',
  'RELIABILITY',
  'SCALABILITY',
]);

export async function practiceRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // Routes require authentication
  app.addHook('preHandler', fastify.authenticate);

  // GET /v1/guides - published guides, filterable by category
  app.get(
    '/guides',
    {
      schema: {
        querystring: z.object({
          category: categoryEnum.optional(),
        }),
      },
    },
    async (request, reply) => {
      const { category } = request.query;

      const isStaff =
        request.user?.role === 'ORG_ADMIN' ||
        request.user?.role === 'INSTRUCTOR' ||
        request.user?.role === 'SUPER_ADMIN';

      const guides = await prisma.guide.findMany({
        where: {
          OR: [
            { orgId: null },
            { orgId: request.orgId! },
          ],
          ...(category ? { category: category as GuideCategory } : {}),
          ...(!isStaff ? { published: true } : {}),
        },
        select: {
          id: true,
          title: true,
          slug: true,
          category: true,
          summary: true,
          difficulty: true,
          readTimeMinutes: true,
          published: true,
          orgId: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      return reply.send(guides);
    }
  );

  // GET /v1/guides/:slug - full guide
  app.get(
    '/guides/:slug',
    {
      schema: {
        params: z.object({
          slug: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { slug } = request.params;

      const isStaff =
        request.user?.role === 'ORG_ADMIN' ||
        request.user?.role === 'INSTRUCTOR' ||
        request.user?.role === 'SUPER_ADMIN';

      const guide = await prisma.guide.findFirst({
        where: {
          slug,
          OR: [
            { orgId: null },
            { orgId: request.orgId! },
          ],
          ...(!isStaff ? { published: true } : {}),
        },
      });

      if (!guide) {
        return reply.status(404).send({
          error: {
            message: 'Guide not found',
            code: 'NOT_FOUND',
          },
        });
      }

      return reply.send(guide);
    }
  );

  // GET /v1/tactics - published tactics, filterable by category
  app.get(
    '/tactics',
    {
      schema: {
        querystring: z.object({
          category: categoryEnum.optional(),
        }),
      },
    },
    async (request, reply) => {
      const { category } = request.query;

      const isStaff =
        request.user?.role === 'ORG_ADMIN' ||
        request.user?.role === 'INSTRUCTOR' ||
        request.user?.role === 'SUPER_ADMIN';

      const tactics = await prisma.tactic.findMany({
        where: {
          OR: [
            { orgId: null },
            { orgId: request.orgId! },
          ],
          ...(category ? { category: category as GuideCategory } : {}),
          ...(!isStaff ? { published: true } : {}),
        },
        orderBy: { createdAt: 'asc' },
      });

      return reply.send(tactics);
    }
  );

  // GET /v1/tactics/:id - single tactic with all detail fields
  app.get(
    '/tactics/:id',
    {
      schema: {
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const isStaff =
        request.user?.role === 'ORG_ADMIN' ||
        request.user?.role === 'INSTRUCTOR' ||
        request.user?.role === 'SUPER_ADMIN';

      const tactic = await prisma.tactic.findFirst({
        where: {
          id,
          OR: [
            { orgId: null },
            { orgId: request.orgId! },
          ],
          ...(!isStaff ? { published: true } : {}),
        },
      });

      if (!tactic) {
        return reply.status(404).send({
          error: {
            message: 'Tactic not found',
            code: 'NOT_FOUND',
          },
        });
      }

      return reply.send(tactic);
    }
  );
}

