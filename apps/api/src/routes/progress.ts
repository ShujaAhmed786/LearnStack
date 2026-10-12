import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from 'db';

export async function progressRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // All progress routes require authentication
  app.addHook('preHandler', fastify.authenticate);

  // POST /v1/topics/:id/complete - marks topic complete for current user
  app.post(
    '/topics/:id/complete',
    {
      schema: {
        params: z.object({ id: z.string() }).strict(),
      },
    },
    async (request, reply) => {
      const { id: topicId } = request.params;

      const topic = await prisma.topic.findFirst({
        where: { id: topicId, orgId: request.orgId! },
      });

      if (!topic) {
        return reply.status(404).send({
          error: {
            message: 'Topic not found',
            code: 'NOT_FOUND',
          },
        });
      }

      const progress = await prisma.progress.upsert({
        where: {
          userId_topicId: {
            userId: request.user!.id,
            topicId,
          },
        },
        update: {
          completed: true,
        },
        create: {
          userId: request.user!.id,
          topicId,
          orgId: request.orgId!,
          completed: true,
        },
      });

      return reply.send({
        success: true,
        progress: {
          id: progress.id,
          topicId: progress.topicId,
          completed: progress.completed,
          lastPosition: progress.lastPosition,
          updatedAt: progress.updatedAt,
        },
      });
    }
  );

  // POST /v1/topics/:id/progress - update playback position / state
  app.post(
    '/topics/:id/progress',
    {
      schema: {
        params: z.object({ id: z.string() }).strict(),
        body: z
          .object({
            lastPosition: z.number().int().min(0),
            completed: z.boolean().optional(),
          })
          .strict(),
      },
    },
    async (request, reply) => {
      const { id: topicId } = request.params;
      const { lastPosition, completed } = request.body;

      const topic = await prisma.topic.findFirst({
        where: { id: topicId, orgId: request.orgId! },
      });

      if (!topic) {
        return reply.status(404).send({
          error: {
            message: 'Topic not found',
            code: 'NOT_FOUND',
          },
        });
      }

      const progress = await prisma.progress.upsert({
        where: {
          userId_topicId: {
            userId: request.user!.id,
            topicId,
          },
        },
        update: {
          lastPosition,
          ...(completed !== undefined && { completed }),
        },
        create: {
          userId: request.user!.id,
          topicId,
          orgId: request.orgId!,
          lastPosition,
          completed: completed ?? false,
        },
      });

      return reply.send({
        success: true,
        progress: {
          id: progress.id,
          topicId: progress.topicId,
          completed: progress.completed,
          lastPosition: progress.lastPosition,
          updatedAt: progress.updatedAt,
        },
      });
    }
  );

  // GET /v1/progress - current user's progress across all topics
  app.get('/progress', async (request, reply) => {
    const list = await prisma.progress.findMany({
      where: {
        userId: request.user!.id,
        orgId: request.orgId!,
      },
      include: {
        topic: {
          select: {
            id: true,
            title: true,
            subjectId: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return reply.send(list);
  });

  // GET /v1/progress/summary - counts: total topics, completed, in-progress per subject
  app.get('/progress/summary', async (request, reply) => {
    const userId = request.user!.id;
    const orgId = request.orgId!;

    // Fetch all topics in org
    const allTopics = await prisma.topic.findMany({
      where: { orgId },
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
    });

    // Fetch user progress in org
    const userProgress = await prisma.progress.findMany({
      where: { userId, orgId },
      orderBy: { updatedAt: 'desc' },
    });

    const progressMap = new Map(userProgress.map((p) => [p.topicId, p]));

    let totalCompleted = 0;
    let totalInProgress = 0;

    userProgress.forEach((p) => {
      if (p.completed) {
        totalCompleted++;
      } else if (p.lastPosition > 0) {
        totalInProgress++;
      }
    });

    // Group by Subject
    const subjectMap = new Map<
      string,
      {
        subjectId: string;
        subjectName: string;
        collectionName: string;
        categoryName: string;
        totalTopics: number;
        completedTopics: number;
      }
    >();

    allTopics.forEach((t) => {
      const sub = t.subject;
      if (!subjectMap.has(sub.id)) {
        subjectMap.set(sub.id, {
          subjectId: sub.id,
          subjectName: sub.name,
          collectionName: sub.collection.name,
          categoryName: sub.collection.category.name,
          totalTopics: 0,
          completedTopics: 0,
        });
      }

      const entry = subjectMap.get(sub.id)!;
      entry.totalTopics++;

      const prog = progressMap.get(t.id);
      if (prog && prog.completed) {
        entry.completedTopics++;
      }
    });

    const subjectsSummary = Array.from(subjectMap.values()).map((s) => ({
      ...s,
      percentComplete:
        s.totalTopics > 0 ? Math.round((s.completedTopics / s.totalTopics) * 100) : 0,
    }));

    // Find last accessed topic for "Continue Learning"
    let lastAccessedTopic = null;
    if (userProgress.length > 0) {
      const lastProg = userProgress[0];
      const matchedTopic = allTopics.find((t) => t.id === lastProg.topicId);
      if (matchedTopic) {
        lastAccessedTopic = {
          topicId: matchedTopic.id,
          topicTitle: matchedTopic.title,
          subjectName: matchedTopic.subject.name,
          lastPosition: lastProg.lastPosition,
          updatedAt: lastProg.updatedAt,
        };
      }
    }

    return reply.send({
      totalTopics: allTopics.length,
      completedTopics: totalCompleted,
      inProgressTopics: totalInProgress,
      subjects: subjectsSummary,
      lastAccessedTopic,
    });
  });
}
