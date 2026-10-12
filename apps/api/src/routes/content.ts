import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from 'db';
import { requireRole } from '../plugins/auth.js';

export async function contentRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // All content routes require authentication
  app.addHook('preHandler', fastify.authenticate);

  // ==========================================
  // CATEGORIES
  // ==========================================

  // GET /v1/categories - list with counts
  app.get('/categories', async (request, reply) => {
    const categories = await prisma.category.findMany({
      where: { orgId: request.orgId! },
      include: {
        _count: {
          select: { collections: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return reply.send(categories);
  });

  // POST /v1/categories (ORG_ADMIN, INSTRUCTOR)
  app.post(
    '/categories',
    {
      preHandler: [requireRole('ORG_ADMIN', 'INSTRUCTOR')],
      schema: {
        body: z
          .object({
            name: z.string().min(1, 'Name is required').trim(),
            description: z.string().optional(),
          })
          .strict(),
      },
    },
    async (request, reply) => {
      const { name, description } = request.body;

      const existing = await prisma.category.findUnique({
        where: {
          orgId_name: {
            orgId: request.orgId!,
            name,
          },
        },
      });

      if (existing) {
        return reply.status(409).send({
          error: {
            message: 'Category with this name already exists',
            code: 'CATEGORY_ALREADY_EXISTS',
          },
        });
      }

      const category = await prisma.category.create({
        data: {
          name,
          description: description || null,
          orgId: request.orgId!,
        },
      });

      return reply.status(201).send(category);
    }
  );

  // PATCH /v1/categories/:id (ORG_ADMIN, INSTRUCTOR)
  app.patch(
    '/categories/:id',
    {
      preHandler: [requireRole('ORG_ADMIN', 'INSTRUCTOR')],
      schema: {
        params: z.object({ id: z.string() }).strict(),
        body: z
          .object({
            name: z.string().min(1).trim().optional(),
            description: z.string().optional().nullable(),
          })
          .strict(),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { name, description } = request.body;

      const category = await prisma.category.findFirst({
        where: { id, orgId: request.orgId! },
      });

      if (!category) {
        return reply.status(404).send({
          error: {
            message: 'Category not found',
            code: 'NOT_FOUND',
          },
        });
      }

      const updated = await prisma.category.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
        },
      });

      return reply.send(updated);
    }
  );

  // DELETE /v1/categories/:id (ORG_ADMIN)
  app.delete(
    '/categories/:id',
    {
      preHandler: [requireRole('ORG_ADMIN')],
      schema: {
        params: z.object({ id: z.string() }).strict(),
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const category = await prisma.category.findFirst({
        where: { id, orgId: request.orgId! },
      });

      if (!category) {
        return reply.status(404).send({
          error: {
            message: 'Category not found',
            code: 'NOT_FOUND',
          },
        });
      }

      await prisma.category.delete({
        where: { id },
      });

      return reply.send({ success: true });
    }
  );

  // ==========================================
  // COLLECTIONS
  // ==========================================

  // GET /v1/categories/:id/collections
  app.get(
    '/categories/:id/collections',
    {
      schema: {
        params: z.object({ id: z.string() }).strict(),
      },
    },
    async (request, reply) => {
      const { id: categoryId } = request.params;

      const category = await prisma.category.findFirst({
        where: { id: categoryId, orgId: request.orgId! },
      });

      if (!category) {
        return reply.status(404).send({
          error: {
            message: 'Category not found',
            code: 'NOT_FOUND',
          },
        });
      }

      const collections = await prisma.collection.findMany({
        where: { categoryId, orgId: request.orgId! },
        include: {
          _count: {
            select: { subjects: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      return reply.send(collections);
    }
  );

  // POST /v1/categories/:id/collections (ORG_ADMIN, INSTRUCTOR)
  app.post(
    '/categories/:id/collections',
    {
      preHandler: [requireRole('ORG_ADMIN', 'INSTRUCTOR')],
      schema: {
        params: z.object({ id: z.string() }).strict(),
        body: z
          .object({
            name: z.string().min(1, 'Name is required').trim(),
            description: z.string().optional(),
          })
          .strict(),
      },
    },
    async (request, reply) => {
      const { id: categoryId } = request.params;
      const { name, description } = request.body;

      const category = await prisma.category.findFirst({
        where: { id: categoryId, orgId: request.orgId! },
      });

      if (!category) {
        return reply.status(404).send({
          error: {
            message: 'Category not found',
            code: 'NOT_FOUND',
          },
        });
      }

      const collection = await prisma.collection.create({
        data: {
          name,
          description: description || null,
          categoryId,
          orgId: request.orgId!,
        },
      });

      return reply.status(201).send(collection);
    }
  );

  // PATCH /v1/collections/:id (ORG_ADMIN, INSTRUCTOR)
  app.patch(
    '/collections/:id',
    {
      preHandler: [requireRole('ORG_ADMIN', 'INSTRUCTOR')],
      schema: {
        params: z.object({ id: z.string() }).strict(),
        body: z
          .object({
            name: z.string().min(1).trim().optional(),
            description: z.string().optional().nullable(),
          })
          .strict(),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { name, description } = request.body;

      const collection = await prisma.collection.findFirst({
        where: { id, orgId: request.orgId! },
      });

      if (!collection) {
        return reply.status(404).send({
          error: {
            message: 'Collection not found',
            code: 'NOT_FOUND',
          },
        });
      }

      const updated = await prisma.collection.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
        },
      });

      return reply.send(updated);
    }
  );

  // DELETE /v1/collections/:id (ORG_ADMIN)
  app.delete(
    '/collections/:id',
    {
      preHandler: [requireRole('ORG_ADMIN')],
      schema: {
        params: z.object({ id: z.string() }).strict(),
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const collection = await prisma.collection.findFirst({
        where: { id, orgId: request.orgId! },
      });

      if (!collection) {
        return reply.status(404).send({
          error: {
            message: 'Collection not found',
            code: 'NOT_FOUND',
          },
        });
      }

      await prisma.collection.delete({
        where: { id },
      });

      return reply.send({ success: true });
    }
  );

  // ==========================================
  // SUBJECTS
  // ==========================================

  // GET /v1/collections/:id/subjects
  app.get(
    '/collections/:id/subjects',
    {
      schema: {
        params: z.object({ id: z.string() }).strict(),
      },
    },
    async (request, reply) => {
      const { id: collectionId } = request.params;

      const collection = await prisma.collection.findFirst({
        where: { id: collectionId, orgId: request.orgId! },
      });

      if (!collection) {
        return reply.status(404).send({
          error: {
            message: 'Collection not found',
            code: 'NOT_FOUND',
          },
        });
      }

      const subjects = await prisma.subject.findMany({
        where: { collectionId, orgId: request.orgId! },
        include: {
          _count: {
            select: { topics: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      return reply.send(subjects);
    }
  );

  // POST /v1/collections/:id/subjects (ORG_ADMIN, INSTRUCTOR)
  app.post(
    '/collections/:id/subjects',
    {
      preHandler: [requireRole('ORG_ADMIN', 'INSTRUCTOR')],
      schema: {
        params: z.object({ id: z.string() }).strict(),
        body: z
          .object({
            name: z.string().min(1, 'Name is required').trim(),
            description: z.string().optional(),
          })
          .strict(),
      },
    },
    async (request, reply) => {
      const { id: collectionId } = request.params;
      const { name, description } = request.body;

      const collection = await prisma.collection.findFirst({
        where: { id: collectionId, orgId: request.orgId! },
      });

      if (!collection) {
        return reply.status(404).send({
          error: {
            message: 'Collection not found',
            code: 'NOT_FOUND',
          },
        });
      }

      const subject = await prisma.subject.create({
        data: {
          name,
          description: description || null,
          collectionId,
          orgId: request.orgId!,
        },
      });

      return reply.status(201).send(subject);
    }
  );

  // PATCH /v1/subjects/:id (ORG_ADMIN, INSTRUCTOR)
  app.patch(
    '/subjects/:id',
    {
      preHandler: [requireRole('ORG_ADMIN', 'INSTRUCTOR')],
      schema: {
        params: z.object({ id: z.string() }).strict(),
        body: z
          .object({
            name: z.string().min(1).trim().optional(),
            description: z.string().optional().nullable(),
          })
          .strict(),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { name, description } = request.body;

      const subject = await prisma.subject.findFirst({
        where: { id, orgId: request.orgId! },
      });

      if (!subject) {
        return reply.status(404).send({
          error: {
            message: 'Subject not found',
            code: 'NOT_FOUND',
          },
        });
      }

      const updated = await prisma.subject.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
        },
      });

      return reply.send(updated);
    }
  );

  // DELETE /v1/subjects/:id (ORG_ADMIN)
  app.delete(
    '/subjects/:id',
    {
      preHandler: [requireRole('ORG_ADMIN')],
      schema: {
        params: z.object({ id: z.string() }).strict(),
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const subject = await prisma.subject.findFirst({
        where: { id, orgId: request.orgId! },
      });

      if (!subject) {
        return reply.status(404).send({
          error: {
            message: 'Subject not found',
            code: 'NOT_FOUND',
          },
        });
      }

      await prisma.subject.delete({
        where: { id },
      });

      return reply.send({ success: true });
    }
  );

  // ==========================================
  // TOPICS
  // ==========================================

  // GET /v1/subjects/:id/topics - ordered by order field
  app.get(
    '/subjects/:id/topics',
    {
      schema: {
        params: z.object({ id: z.string() }).strict(),
      },
    },
    async (request, reply) => {
      const { id: subjectId } = request.params;

      const subject = await prisma.subject.findFirst({
        where: { id: subjectId, orgId: request.orgId! },
      });

      if (!subject) {
        return reply.status(404).send({
          error: {
            message: 'Subject not found',
            code: 'NOT_FOUND',
          },
        });
      }

      const topics = await prisma.topic.findMany({
        where: { subjectId, orgId: request.orgId! },
        orderBy: { order: 'asc' },
      });

      return reply.send(topics);
    }
  );

  // POST /v1/subjects/:id/topics (ORG_ADMIN, INSTRUCTOR)
  app.post(
    '/subjects/:id/topics',
    {
      preHandler: [requireRole('ORG_ADMIN', 'INSTRUCTOR')],
      schema: {
        params: z.object({ id: z.string() }).strict(),
        body: z
          .object({
            title: z.string().min(1, 'Title is required').trim(),
            content: z.string(),
            order: z.number().int().optional().default(0),
            youtubeUrl: z.string().optional().nullable(),
            videoUrl: z.string().optional().nullable(),
          })
          .strict(),
      },
    },
    async (request, reply) => {
      const { id: subjectId } = request.params;
      const { title, content, order, youtubeUrl, videoUrl } = request.body;

      const subject = await prisma.subject.findFirst({
        where: { id: subjectId, orgId: request.orgId! },
      });

      if (!subject) {
        return reply.status(404).send({
          error: {
            message: 'Subject not found',
            code: 'NOT_FOUND',
          },
        });
      }

      const topic = await prisma.topic.create({
        data: {
          title,
          content,
          order,
          youtubeUrl: youtubeUrl || null,
          videoUrl: videoUrl || null,
          subjectId,
          orgId: request.orgId!,
        },
      });

      return reply.status(201).send(topic);
    }
  );

  // GET /v1/topics/:id - full topic with materials
  app.get(
    '/topics/:id',
    {
      schema: {
        params: z.object({ id: z.string() }).strict(),
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const topic = await prisma.topic.findFirst({
        where: { id, orgId: request.orgId! },
        include: {
          materials: true,
          subject: {
            include: {
              collection: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
      });

      if (!topic) {
        return reply.status(404).send({
          error: {
            message: 'Topic not found',
            code: 'NOT_FOUND',
          },
        });
      }

      return reply.send(topic);
    }
  );

  // PATCH /v1/topics/:id (ORG_ADMIN, INSTRUCTOR) - partial update
  app.patch(
    '/topics/:id',
    {
      preHandler: [requireRole('ORG_ADMIN', 'INSTRUCTOR')],
      schema: {
        params: z.object({ id: z.string() }).strict(),
        body: z
          .object({
            title: z.string().min(1).trim().optional(),
            content: z.string().optional(),
            order: z.number().int().optional(),
            youtubeUrl: z.string().optional().nullable(),
            videoUrl: z.string().optional().nullable(),
          })
          .strict(),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { title, content, order, youtubeUrl, videoUrl } = request.body;

      const existingTopic = await prisma.topic.findFirst({
        where: { id, orgId: request.orgId! },
      });

      if (!existingTopic) {
        return reply.status(404).send({
          error: {
            message: 'Topic not found',
            code: 'NOT_FOUND',
          },
        });
      }

      const updated = await prisma.topic.update({
        where: { id },
        data: {
          ...(title !== undefined && { title }),
          ...(content !== undefined && { content }),
          ...(order !== undefined && { order }),
          ...(youtubeUrl !== undefined && { youtubeUrl }),
          ...(videoUrl !== undefined && { videoUrl }),
        },
        include: {
          materials: true,
        },
      });

      return reply.send(updated);
    }
  );

  // DELETE /v1/topics/:id (ORG_ADMIN) - cascade delete materials
  app.delete(
    '/topics/:id',
    {
      preHandler: [requireRole('ORG_ADMIN')],
      schema: {
        params: z.object({ id: z.string() }).strict(),
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const existingTopic = await prisma.topic.findFirst({
        where: { id, orgId: request.orgId! },
      });

      if (!existingTopic) {
        return reply.status(404).send({
          error: {
            message: 'Topic not found',
            code: 'NOT_FOUND',
          },
        });
      }

      await prisma.topic.delete({
        where: { id },
      });

      return reply.send({ success: true });
    }
  );

  // ==========================================
  // SEARCH
  // ==========================================

  // GET /v1/search?q= - search topics by title/content within org
  app.get(
    '/search',
    {
      schema: {
        querystring: z
          .object({
            q: z.string().min(1, 'Search query is required').trim(),
          })
          .strict(),
      },
    },
    async (request, reply) => {
      const { q } = request.query;

      const topics = await prisma.topic.findMany({
        where: {
          orgId: request.orgId!,
          OR: [
            {
              title: {
                contains: q,
                mode: 'insensitive',
              },
            },
            {
              content: {
                contains: q,
                mode: 'insensitive',
              },
            },
          ],
        },
        include: {
          subject: {
            include: {
              collection: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send(topics);
    }
  );
}
