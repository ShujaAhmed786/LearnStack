import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from 'db';
import { requireRole } from '../plugins/auth.js';

export async function discussionRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  /**
   * GET /v1/discussions
   * List threads filtered by lessonId or courseId, pinned first
   */
  server.get(
    '/discussions',
    {
      schema: {
        querystring: z.object({
          lessonId: z.string().optional(),
          courseId: z.string().optional(),
          sort: z.enum(['recent', 'active']).default('recent'),
        }),
      },
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
        });
      }

      const { lessonId, courseId, sort } = request.query;
      const orgId = request.user.orgId;

      const threads = await prisma.discussionThread.findMany({
        where: {
          orgId,
          ...(lessonId ? { lessonId } : {}),
          ...(courseId ? { courseId } : {}),
        },
        include: {
          author: {
            select: { id: true, name: true, email: true, role: true },
          },
          posts: {
            select: { id: true, isAnswer: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: [
          { pinned: 'desc' },
          sort === 'active' ? { updatedAt: 'desc' } : { createdAt: 'desc' },
        ],
      });

      const enriched = await Promise.all(
        threads.map(async (t) => {
          const [course, lesson] = await Promise.all([
            t.courseId
              ? prisma.roadmap.findUnique({
                  where: { id: t.courseId },
                  select: { id: true, title: true, slug: true },
                })
              : null,
            t.lessonId
              ? prisma.roadmapTopic.findUnique({
                  where: { id: t.lessonId },
                  select: { id: true, title: true },
                })
              : null,
          ]);

          const postCount = t.posts.length;
          const hasAcceptedAnswer = t.posts.some((p) => p.isAnswer);

          return {
            id: t.id,
            title: t.title,
            lessonId: t.lessonId,
            courseId: t.courseId,
            orgId: t.orgId,
            authorId: t.authorId,
            pinned: t.pinned,
            locked: t.locked,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            postCount,
            hasAcceptedAnswer,
            author: t.author,
            course,
            lesson,
          };
        })
      );

      return reply.send(enriched);
    }
  );

  /**
   * POST /v1/discussions
   * Create discussion thread + first post
   */
  server.post(
    '/discussions',
    {
      schema: {
        body: z.object({
          title: z.string().min(3).max(200),
          content: z.string().min(3),
          lessonId: z.string().optional(),
          courseId: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
        });
      }

      const { title, content, lessonId, courseId } = request.body;
      const user = request.user;

      const thread = await prisma.$transaction(async (tx) => {
        const t = await tx.discussionThread.create({
          data: {
            title,
            lessonId: lessonId || null,
            courseId: courseId || null,
            orgId: user.orgId,
            authorId: user.id,
          },
        });

        await tx.discussionPost.create({
          data: {
            threadId: t.id,
            authorId: user.id,
            content,
            orgId: user.orgId,
            isAnswer: false,
          },
        });

        return t;
      });

      const fullThread = await prisma.discussionThread.findUnique({
        where: { id: thread.id },
        include: {
          author: {
            select: { id: true, name: true, email: true, role: true },
          },
          posts: {
            include: {
              author: {
                select: { id: true, name: true, email: true, role: true },
              },
            },
          },
        },
      });

      return reply.status(201).send(fullThread);
    }
  );

  /**
   * GET /v1/discussions/:id
   * Get thread with all posts, accepted answers sorted first
   */
  server.get(
    '/discussions/:id',
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

      const thread = await prisma.discussionThread.findUnique({
        where: { id },
        include: {
          author: {
            select: { id: true, name: true, email: true, role: true },
          },
          posts: {
            include: {
              author: {
                select: { id: true, name: true, email: true, role: true },
              },
            },
            orderBy: [{ isAnswer: 'desc' }, { createdAt: 'asc' }],
          },
        },
      });

      if (!thread) {
        return reply.status(404).send({
          error: { message: 'Discussion thread not found', code: 'NOT_FOUND' },
        });
      }

      const [course, lesson] = await Promise.all([
        thread.courseId
          ? prisma.roadmap.findUnique({
              where: { id: thread.courseId },
              select: { id: true, title: true, slug: true },
            })
          : null,
        thread.lessonId
          ? prisma.roadmapTopic.findUnique({
              where: { id: thread.lessonId },
              select: { id: true, title: true },
            })
          : null,
      ]);

      return reply.send({
        ...thread,
        course,
        lesson,
        postCount: thread.posts.length,
        hasAcceptedAnswer: thread.posts.some((p) => p.isAnswer),
      });
    }
  );

  /**
   * POST /v1/discussions/:id/posts
   * Reply to a discussion thread
   */
  server.post(
    '/discussions/:id/posts',
    {
      schema: {
        params: z.object({
          id: z.string(),
        }),
        body: z.object({
          content: z.string().min(1),
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
      const { content } = request.body;
      const user = request.user;

      const thread = await prisma.discussionThread.findUnique({
        where: { id },
      });

      if (!thread) {
        return reply.status(404).send({
          error: { message: 'Discussion thread not found', code: 'NOT_FOUND' },
        });
      }

      if (thread.locked) {
        return reply.status(400).send({
          error: { message: 'This discussion thread is locked', code: 'THREAD_LOCKED' },
        });
      }

      const post = await prisma.discussionPost.create({
        data: {
          threadId: id,
          authorId: user.id,
          content,
          orgId: user.orgId,
          isAnswer: false,
        },
        include: {
          author: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });

      // Update thread updatedAt
      await prisma.discussionThread.update({
        where: { id },
        data: { updatedAt: new Date() },
      });

      return reply.status(201).send(post);
    }
  );

  /**
   * PATCH /v1/discussions/:id/posts/:postId/answer
   * Mark / toggle post as accepted answer (INSTRUCTOR, ORG_ADMIN, SUPER_ADMIN)
   */
  server.patch(
    '/discussions/:id/posts/:postId/answer',
    {
      preHandler: [requireRole('INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN')],
      schema: {
        params: z.object({
          id: z.string(),
          postId: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { id, postId } = request.params;

      const post = await prisma.discussionPost.findUnique({
        where: { id: postId },
      });

      if (!post || post.threadId !== id) {
        return reply.status(404).send({
          error: { message: 'Post not found in this thread', code: 'NOT_FOUND' },
        });
      }

      const newAnswerStatus = !post.isAnswer;

      // If marking as answer, unmark others in this thread first
      if (newAnswerStatus) {
        await prisma.discussionPost.updateMany({
          where: { threadId: id },
          data: { isAnswer: false },
        });
      }

      const updated = await prisma.discussionPost.update({
        where: { id: postId },
        data: { isAnswer: newAnswerStatus },
        include: {
          author: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });

      return reply.send(updated);
    }
  );

  /**
   * PATCH /v1/discussions/:id/pin
   * Pin or unpin thread (INSTRUCTOR, ORG_ADMIN, SUPER_ADMIN)
   */
  server.patch(
    '/discussions/:id/pin',
    {
      preHandler: [requireRole('INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN')],
      schema: {
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const thread = await prisma.discussionThread.findUnique({
        where: { id },
      });

      if (!thread) {
        return reply.status(404).send({
          error: { message: 'Thread not found', code: 'NOT_FOUND' },
        });
      }

      const updated = await prisma.discussionThread.update({
        where: { id },
        data: { pinned: !thread.pinned },
      });

      return reply.send(updated);
    }
  );

  /**
   * DELETE /v1/discussions/:id
   * Delete thread (Author, ORG_ADMIN, SUPER_ADMIN)
   */
  server.delete(
    '/discussions/:id',
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

      const thread = await prisma.discussionThread.findUnique({
        where: { id },
      });

      if (!thread) {
        return reply.status(404).send({
          error: { message: 'Thread not found', code: 'NOT_FOUND' },
        });
      }

      const isOwner = thread.authorId === user.id;
      const isStaff = user.role === 'ORG_ADMIN' || user.role === 'SUPER_ADMIN';

      if (!isOwner && !isStaff) {
        return reply.status(403).send({
          error: { message: 'Cannot delete thread', code: 'FORBIDDEN' },
        });
      }

      await prisma.discussionThread.delete({
        where: { id },
      });

      return reply.send({ success: true });
    }
  );
}
