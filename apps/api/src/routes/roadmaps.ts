import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from 'db';

export async function roadmapRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // All roadmap routes require authentication
  app.addHook('preHandler', fastify.authenticate);

  // GET /v1/roadmaps and /v1/courses - list all
  const listRoadmapsHandler = async (request: any, reply: any) => {
    const roadmaps = await prisma.roadmap.findMany({
      where: {
        OR: [
          { orgId: null },
          { orgId: request.orgId! },
        ],
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

    // Fetch user topic progress for all topics in these roadmaps
    const allTopicIds = roadmaps.flatMap((r) =>
      r.stages.flatMap((s) => s.topics.map((t) => t.id))
    );

    const [userProgress, products, enrollments] = await Promise.all([
      prisma.topicProgress.findMany({
        where: {
          userId: request.user!.id,
          topicId: { in: allTopicIds },
          completed: true,
        },
        select: { topicId: true },
      }),
      prisma.product.findMany({
        where: {
          courseId: { in: roadmaps.map((r) => r.id) },
          active: true,
        },
      }),
      prisma.enrollment.findMany({
        where: {
          userId: request.user!.id,
          courseId: { in: roadmaps.map((r) => r.id) },
        },
      }),
    ]);

    const completedTopicIds = new Set(userProgress.map((p) => p.topicId));
    const productMap = new Map(products.map((p) => [p.courseId, p]));
    const enrolledSet = new Set(enrollments.map((e) => e.courseId));
    const isStaff =
      request.user?.role === 'ORG_ADMIN' ||
      request.user?.role === 'INSTRUCTOR' ||
      request.user?.role === 'SUPER_ADMIN';

    const result = roadmaps.map((rm) => {
      let totalTopics = 0;
      let completedTopics = 0;

      const stages = rm.stages.map((stage) => {
        const stageTotal = stage.topics.length;
        const stageCompleted = stage.topics.filter((t) =>
          completedTopicIds.has(t.id)
        ).length;
        const stagePercent =
          stageTotal > 0 ? Math.round((stageCompleted / stageTotal) * 100) : 0;

        totalTopics += stageTotal;
        completedTopics += stageCompleted;

        return {
          id: stage.id,
          roadmapId: stage.roadmapId,
          title: stage.title,
          order: stage.order,
          totalTopics: stageTotal,
          completedTopics: stageCompleted,
          percentComplete: stagePercent,
        };
      });

      const percentComplete =
        totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

      const product = productMap.get(rm.id);
      const isFree = !product || product.priceCents === 0;
      const isEnrolled = isFree || enrolledSet.has(rm.id) || isStaff;

      return {
        id: rm.id,
        title: rm.title,
        slug: rm.slug,
        description: rm.description,
        icon: rm.icon,
        orgId: rm.orgId,
        createdAt: rm.createdAt,
        totalTopics,
        completedTopics,
        percentComplete,
        priceCents: product?.priceCents || null,
        currency: product?.currency || 'usd',
        isFree,
        isEnrolled,
        stages,
      };
    });

    return reply.send(result);
  };

  // GET /v1/roadmaps and /v1/courses
  app.get('/roadmaps', listRoadmapsHandler);
  app.get('/courses', listRoadmapsHandler);


  // GET /v1/roadmaps/:slug and /v1/courses/:slug - full roadmap
  const getRoadmapBySlugHandler = async (request: any, reply: any) => {
      const { slug } = request.params;

      const roadmap = await prisma.roadmap.findFirst({
        where: {
          slug,
          OR: [
            { orgId: null },
            { orgId: request.orgId! },
          ],
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
      });

      if (!roadmap) {
        return reply.status(404).send({
          error: {
            message: 'Roadmap not found',
            code: 'NOT_FOUND',
          },
        });
      }

      const topicIds = roadmap.stages.flatMap((s) => s.topics.map((t) => t.id));
      const quizIds = roadmap.stages
        .flatMap((s) => s.topics.map((t) => t.quizId))
        .filter((q): q is string => Boolean(q));

      const userProgress = await prisma.topicProgress.findMany({
        where: {
          userId: request.user!.id,
          topicId: { in: topicIds },
        },
      });

      const progressMap = new Map(
        userProgress.map((p) => [p.topicId, p.completed])
      );

      // Fetch linked quizzes
      const quizzes =
        quizIds.length > 0
          ? await prisma.quiz.findMany({
              where: { id: { in: quizIds } },
              include: {
                _count: {
                  select: { questions: true },
                },
              },
            })
          : [];
      const quizMap = new Map(quizzes.map((q) => [q.id, q]));

      // Fetch user attempts for these quizzes
      const userAttempts =
        quizIds.length > 0
          ? await prisma.quizAttempt.findMany({
              where: {
                quizId: { in: quizIds },
                userId: request.user!.id,
                completedAt: { not: null },
              },
              select: {
                quizId: true,
                score: true,
                passed: true,
              },
            })
          : [];

      const attemptsByQuiz = new Map<
        string,
        { bestScore: number | null; passed: boolean }
      >();
      for (const qId of quizIds) {
        const attempts = userAttempts.filter((a) => a.quizId === qId);
        const scores = attempts
          .map((a) => a.score)
          .filter((s): s is number => typeof s === 'number');
        const bestScore = scores.length > 0 ? Math.max(...scores) : null;
        const passed = attempts.some((a) => a.passed === true);
        attemptsByQuiz.set(qId, { bestScore, passed });
      }

      let totalTopics = 0;
      let completedTopics = 0;

      // Access & Enrollment check
      const isStaff =
        request.user?.role === 'ORG_ADMIN' ||
        request.user?.role === 'INSTRUCTOR' ||
        request.user?.role === 'SUPER_ADMIN';

      const [product, enrollment] = await Promise.all([
        prisma.product.findFirst({
          where: { courseId: roadmap.id, active: true },
        }),
        prisma.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId: request.user!.id,
              courseId: roadmap.id,
            },
          },
        }),
      ]);

      const isFree = !product || product.priceCents === 0;
      const isEnrolled = isFree || Boolean(enrollment) || isStaff;

      const stages = roadmap.stages.map((stage) => {
        const topics = stage.topics.map((t) => {
          const isCompleted = progressMap.get(t.id) === true;
          if (isCompleted) completedTopics++;
          totalTopics++;

          const quiz = t.quizId ? quizMap.get(t.quizId) : null;
          const attemptInfo = t.quizId ? attemptsByQuiz.get(t.quizId) : undefined;

          return {
            id: t.id,
            stageId: t.stageId,
            title: t.title,
            description: isEnrolled ? t.description : null,
            youtubeUrl: isEnrolled ? t.youtubeUrl : null,
            quizId: t.quizId,
            quizTitle: quiz ? quiz.title : null,
            questionCount: quiz ? quiz._count.questions : 0,
            userBestScore: attemptInfo ? attemptInfo.bestScore : null,
            passed: attemptInfo ? attemptInfo.passed : false,
            order: t.order,
            completed: isCompleted,
            locked: !isEnrolled,
          };
        });

        const stageCompleted = topics.filter((t) => t.completed).length;
        const stageTotal = topics.length;
        const stagePercent =
          stageTotal > 0 ? Math.round((stageCompleted / stageTotal) * 100) : 0;

        return {
          id: stage.id,
          roadmapId: stage.roadmapId,
          title: stage.title,
          order: stage.order,
          totalTopics: stageTotal,
          completedTopics: stageCompleted,
          percentComplete: stagePercent,
          topics,
        };
      });

      const percentComplete =
        totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

      return reply.send({
        id: roadmap.id,
        title: roadmap.title,
        slug: roadmap.slug,
        description: roadmap.description,
        icon: roadmap.icon,
        orgId: roadmap.orgId,
        createdAt: roadmap.createdAt,
        totalTopics,
        completedTopics,
        percentComplete,
        priceCents: product?.priceCents || null,
        currency: product?.currency || 'usd',
        isFree,
        isEnrolled,
        stages,
      });
    };

  app.get(
    '/roadmaps/:slug',
    {
      schema: {
        params: z.object({
          slug: z.string(),
        }),
      },
    },
    getRoadmapBySlugHandler
  );

  app.get(
    '/courses/:slug',
    {
      schema: {
        params: z.object({
          slug: z.string(),
        }),
      },
    },
    getRoadmapBySlugHandler
  );

  // GET /v1/courses/:slug/topics/:topicId and /v1/roadmaps/:slug/topics/:topicId - single lesson
  const getTopicDetailHandler = async (request: any, reply: any) => {
    const { slug, topicId } = request.params;

    const roadmap = await prisma.roadmap.findFirst({
      where: {
        slug,
        OR: [{ orgId: null }, { orgId: request.orgId! }],
      },
    });

    if (!roadmap) {
      return reply.status(404).send({
        error: { message: 'Course not found', code: 'NOT_FOUND' },
      });
    }

    const topic = await prisma.roadmapTopic.findFirst({
      where: {
        id: topicId,
        stage: { roadmapId: roadmap.id },
      },
    });

    if (!topic) {
      return reply.status(404).send({
        error: { message: 'Lesson not found', code: 'NOT_FOUND' },
      });
    }

    // Access check: enrollment OR free course OR admin/instructor
    const isStaff =
      request.user?.role === 'ORG_ADMIN' ||
      request.user?.role === 'INSTRUCTOR' ||
      request.user?.role === 'SUPER_ADMIN';

    const [product, enrollment] = await Promise.all([
      prisma.product.findFirst({
        where: { courseId: roadmap.id, active: true },
      }),
      prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: request.user!.id,
            courseId: roadmap.id,
          },
        },
      }),
    ]);

    const isFree = !product || product.priceCents === 0;

    if (!isFree && !enrollment && !isStaff) {
      return reply.status(403).send({
        error: {
          message: 'Enrollment required to access this lesson',
          code: 'ENROLLMENT_REQUIRED',
        },
      });
    }

    return reply.send(topic);
  };

  app.get(
    '/roadmaps/:slug/topics/:topicId',
    {
      schema: {
        params: z.object({ slug: z.string(), topicId: z.string() }),
      },
    },
    getTopicDetailHandler
  );

  app.get(
    '/courses/:slug/topics/:topicId',
    {
      schema: {
        params: z.object({ slug: z.string(), topicId: z.string() }),
      },
    },
    getTopicDetailHandler
  );

  // POST /v1/roadmaps/:slug/topics/:topicId/complete - toggle complete for current user
  const toggleTopicCompleteHandler = async (request: any, reply: any) => {
    const { slug, topicId } = request.params;

    // Verify roadmap & topic exist
    const roadmap = await prisma.roadmap.findFirst({
      where: {
        slug,
        OR: [
          { orgId: null },
          { orgId: request.orgId! },
        ],
      },
    });

    if (!roadmap) {
      return reply.status(404).send({
        error: {
          message: 'Roadmap not found',
          code: 'NOT_FOUND',
        },
      });
    }

    // Access check: paid course requires enrollment
    const isStaff =
      request.user?.role === 'ORG_ADMIN' ||
      request.user?.role === 'INSTRUCTOR' ||
      request.user?.role === 'SUPER_ADMIN';

    const [product, enrollment] = await Promise.all([
      prisma.product.findFirst({
        where: { courseId: roadmap.id, active: true },
      }),
      prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: request.user!.id,
            courseId: roadmap.id,
          },
        },
      }),
    ]);

    const isFree = !product || product.priceCents === 0;

    if (!isFree && !enrollment && !isStaff) {
      return reply.status(403).send({
        error: {
          message: 'Enrollment required to complete lessons in this course',
          code: 'ENROLLMENT_REQUIRED',
        },
      });
    }


      const topic = await prisma.roadmapTopic.findFirst({
        where: {
          id: topicId,
          stage: { roadmapId: roadmap.id },
        },
      });

      if (!topic) {
        return reply.status(404).send({
          error: {
            message: 'Topic not found in this roadmap',
            code: 'NOT_FOUND',
          },
        });
      }

      const existingProgress = await prisma.topicProgress.findUnique({
        where: {
          userId_topicId: {
            userId: request.user!.id,
            topicId,
          },
        },
      });

      const nextCompleted = existingProgress ? !existingProgress.completed : true;

      // Spec 09 Gating Logic: If completing and topic has a quiz, require passing attempt (score >= 70%)
      if (nextCompleted && topic.quizId) {
        const passingAttempt = await prisma.quizAttempt.findFirst({
          where: {
            quizId: topic.quizId,
            userId: request.user!.id,
            passed: true,
          },
        });

        if (!passingAttempt) {
          return reply.status(400).send({
            error: {
              message: 'You must pass the quiz (70%+) to mark this topic complete',
              code: 'QUIZ_REQUIRED',
            },
          });
        }
      }

      const updatedProgress = await prisma.topicProgress.upsert({
        where: {
          userId_topicId: {
            userId: request.user!.id,
            topicId,
          },
        },
        update: {
          completed: nextCompleted,
        },
        create: {
          userId: request.user!.id,
          topicId,
          completed: true,
        },
      });

      return reply.send({
        success: true,
        topicId: updatedProgress.topicId,
        completed: updatedProgress.completed,
      });
    };

  app.post(
    '/roadmaps/:slug/topics/:topicId/complete',
    {
      schema: {
        params: z.object({
          slug: z.string(),
          topicId: z.string(),
        }),
      },
    },
    toggleTopicCompleteHandler
  );

  app.post(
    '/courses/:slug/topics/:topicId/complete',
    {
      schema: {
        params: z.object({
          slug: z.string(),
          topicId: z.string(),
        }),
      },
    },
    toggleTopicCompleteHandler
  );


  // GET /v1/roadmaps/:slug/progress - percentage complete per stage
  app.get(
    '/roadmaps/:slug/progress',
    {
      schema: {
        params: z.object({
          slug: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { slug } = request.params;

      const roadmap = await prisma.roadmap.findFirst({
        where: {
          slug,
          OR: [
            { orgId: null },
            { orgId: request.orgId! },
          ],
        },
        include: {
          stages: {
            orderBy: { order: 'asc' },
            include: {
              topics: {
                select: { id: true },
              },
            },
          },
        },
      });

      if (!roadmap) {
        return reply.status(404).send({
          error: {
            message: 'Roadmap not found',
            code: 'NOT_FOUND',
          },
        });
      }

      const topicIds = roadmap.stages.flatMap((s) => s.topics.map((t) => t.id));

      const completedProgress = await prisma.topicProgress.findMany({
        where: {
          userId: request.user!.id,
          topicId: { in: topicIds },
          completed: true,
        },
        select: { topicId: true },
      });

      const completedSet = new Set(completedProgress.map((p) => p.topicId));

      let overallTotal = 0;
      let overallCompleted = 0;

      const stageProgressList = roadmap.stages.map((stage) => {
        const totalTopics = stage.topics.length;
        const completedTopics = stage.topics.filter((t) =>
          completedSet.has(t.id)
        ).length;
        const percentComplete =
          totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

        overallTotal += totalTopics;
        overallCompleted += completedTopics;

        return {
          stageId: stage.id,
          stageTitle: stage.title,
          order: stage.order,
          totalTopics,
          completedTopics,
          percentComplete,
        };
      });

      const overallPercent =
        overallTotal > 0
          ? Math.round((overallCompleted / overallTotal) * 100)
          : 0;

      return reply.send({
        roadmapId: roadmap.id,
        roadmapSlug: roadmap.slug,
        totalTopics: overallTotal,
        completedTopics: overallCompleted,
        percentComplete: overallPercent,
        stages: stageProgressList,
      });
    }
  );
}
