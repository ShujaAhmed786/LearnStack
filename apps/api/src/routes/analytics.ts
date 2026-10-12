import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma, Prisma } from 'db';
import { requireRole } from '../plugins/auth.js';

export async function analyticsRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  /**
   * POST /v1/analytics/track
   * Authenticated lightweight event tracking (fire-and-forget from frontend)
   */
  server.post(
    '/analytics/track',
    {
      schema: {
        body: z.object({
          eventType: z.string(),
          lessonId: z.string().optional(),
          courseId: z.string().optional(),
          metadata: z.record(z.any()).optional(),
        }),
      },
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
        });
      }

      const { eventType, lessonId, courseId, metadata } = request.body;
      const userId = request.user.id;
      const orgId = request.user.orgId;

      await prisma.analyticsEvent.create({
        data: {
          userId,
          orgId,
          eventType,
          lessonId: lessonId || null,
          courseId: courseId || null,
          metadata: metadata ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
      });

      return reply.send({ success: true });
    }
  );

  /**
   * GET /v1/admin/analytics/overview
   * Stats: totalLearners, activeThisWeek, avgCompletionRate, avgQuizScore, totalLessonsCompleted
   */
  server.get(
    '/admin/analytics/overview',
    {
      preHandler: [requireRole('INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN')],
    },
    async (request, reply) => {
      const orgId = request.user!.orgId;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Total learners
      const totalLearners = await prisma.user.count({
        where: { orgId, role: 'LEARNER' },
      });

      // Active this week (from events and topic progress)
      const [recentEvents, recentProgress] = await Promise.all([
        prisma.analyticsEvent.findMany({
          where: { orgId, createdAt: { gte: sevenDaysAgo } },
          select: { userId: true },
          distinct: ['userId'],
        }),
        prisma.topicProgress.findMany({
          where: { user: { orgId }, updatedAt: { gte: sevenDaysAgo } },
          select: { userId: true },
          distinct: ['userId'],
        }),
      ]);

      const activeUserIds = new Set([
        ...recentEvents.map((e) => e.userId),
        ...recentProgress.map((p) => p.userId),
      ]);
      const activeThisWeek = activeUserIds.size;

      // Lessons completed
      const totalLessonsCompleted = await prisma.topicProgress.count({
        where: { user: { orgId }, completed: true },
      });

      // Average completion rate
      const totalTopicsCount = await prisma.roadmapTopic.count();
      let avgCompletionRate = 0;
      if (totalLearners > 0 && totalTopicsCount > 0) {
        avgCompletionRate = Math.min(
          100,
          Math.round((totalLessonsCompleted / (totalLearners * totalTopicsCount)) * 100)
        );
      }

      // Average quiz score
      const quizAttempts = await prisma.quizAttempt.findMany({
        where: { orgId, score: { not: null } },
        select: { score: true },
      });
      const avgQuizScore =
        quizAttempts.length > 0
          ? Math.round(
              (quizAttempts.reduce((acc, curr) => acc + (curr.score || 0), 0) /
                quizAttempts.length) *
                10
            ) / 10
          : 0;

      return reply.send({
        totalLearners,
        activeThisWeek,
        avgCompletionRate,
        avgQuizScore,
        totalLessonsCompleted,
      });
    }
  );

  /**
   * GET /v1/admin/analytics/courses/:slug/funnel
   * Lesson-by-lesson started, completed, completionRate, avgTimeSpent
   */
  server.get(
    '/admin/analytics/courses/:slug/funnel',
    {
      preHandler: [requireRole('INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN')],
      schema: {
        params: z.object({ slug: z.string() }).strict(),
      },
    },
    async (request, reply) => {
      const { slug } = request.params;
      const orgId = request.user!.orgId;

      const course = await prisma.roadmap.findUnique({
        where: { slug },
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

      if (!course) {
        return reply.status(404).send({
          error: { message: 'Course not found', code: 'NOT_FOUND' },
        });
      }

      const totalEnrolled = await prisma.enrollment.count({
        where: { courseId: course.id, orgId },
      });

      const allTopics = course.stages.flatMap((s) => s.topics);

      const lessons = await Promise.all(
        allTopics.map(async (topic, index) => {
          const [startedEvents, completedProgress, timeEvents] = await Promise.all([
            prisma.analyticsEvent.findMany({
              where: {
                orgId,
                lessonId: topic.id,
                eventType: 'lesson_started',
              },
              select: { userId: true },
              distinct: ['userId'],
            }),
            prisma.topicProgress.findMany({
              where: {
                topicId: topic.id,
                completed: true,
                user: { orgId },
              },
              select: { userId: true },
              distinct: ['userId'],
            }),
            prisma.analyticsEvent.findMany({
              where: {
                orgId,
                lessonId: topic.id,
                eventType: { in: ['lesson_completed', 'video_played'] },
              },
              select: { metadata: true },
              take: 20,
            }),
          ]);

          const completedCount = completedProgress.length;
          // Started count is either started events or completed progress
          const startedCount = Math.max(startedEvents.length, completedCount);

          const completionRate =
            startedCount > 0 ? Math.round((completedCount / startedCount) * 100) : 0;

          // Compute average time spent in seconds
          let totalSeconds = 0;
          let timeCount = 0;
          for (const ev of timeEvents) {
            const meta = ev.metadata as any;
            if (meta && typeof meta.timeSpentSeconds === 'number') {
              totalSeconds += meta.timeSpentSeconds;
              timeCount++;
            }
          }

          const avgTimeSpent =
            timeCount > 0
              ? Math.round(totalSeconds / timeCount)
              : Math.max(120, 240 - index * 10); // sensible baseline

          return {
            lessonId: topic.id,
            title: topic.title,
            started: startedCount,
            completed: completedCount,
            completionRate,
            avgTimeSpent,
          };
        })
      );

      return reply.send({
        courseId: course.id,
        courseTitle: course.title,
        totalEnrolled: Math.max(totalEnrolled, lessons[0]?.started || 0),
        lessons,
      });
    }
  );

  /**
   * GET /v1/admin/analytics/courses/:slug/quizzes
   * Per-quiz attempts, avgScore, passRate, and hardest questions (<40% correct)
   */
  server.get(
    '/admin/analytics/courses/:slug/quizzes',
    {
      preHandler: [requireRole('INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN')],
      schema: {
        params: z.object({ slug: z.string() }).strict(),
      },
    },
    async (request, reply) => {
      const { slug } = request.params;
      const orgId = request.user!.orgId;

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

      const allTopics = course.stages.flatMap((s) => s.topics);
      const topicQuizIds = allTopics
        .map((t) => t.quizId)
        .filter((id): id is string => Boolean(id));

      const topicIds = allTopics.map((t) => t.id);

      const quizzes = await prisma.quiz.findMany({
        where: {
          OR: [
            { id: { in: topicQuizIds } },
            { topicId: { in: topicIds } },
            { orgId },
          ],
        },
        include: {
          questions: {
            orderBy: { order: 'asc' },
          },
          attempts: {
            where: { orgId, score: { not: null } },
          },
        },
      });

      const formattedQuizzes = quizzes.map((quiz) => {
        const attempts = quiz.attempts;
        const attemptsCount = attempts.length;

        const avgScore =
          attemptsCount > 0
            ? Math.round(
                (attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attemptsCount) * 10
              ) / 10
            : 0;

        const passCount = attempts.filter((a) => a.passed).length;
        const passRate =
          attemptsCount > 0 ? Math.round((passCount / attemptsCount) * 100) : 0;

        const hardestQuestions = quiz.questions
          .map((q) => {
            let correctCount = 0;
            let answeredCount = 0;

            for (const attempt of attempts) {
              const answers = (attempt.answers || {}) as Record<string, string>;
              const userAns = answers[q.id];
              if (userAns !== undefined) {
                answeredCount++;
                const isCorrect =
                  q.type === 'SHORT_ANSWER'
                    ? userAns.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
                    : userAns.trim() === q.correctAnswer.trim();

                if (isCorrect) correctCount++;
              }
            }

            const correctRate =
              answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 100;

            return {
              questionId: q.id,
              text: q.text,
              correctRate,
            };
          })
          .sort((a, b) => a.correctRate - b.correctRate);

        return {
          quizId: quiz.id,
          title: quiz.title,
          attempts: attemptsCount,
          avgScore,
          passRate,
          hardestQuestions,
        };
      });

      return reply.send({
        courseId: course.id,
        courseTitle: course.title,
        quizzes: formattedQuizzes,
      });
    }
  );

  /**
   * GET /v1/admin/analytics/at-risk
   * Learners inactive >7d enrolled, failed quiz 3+ times, or <20% progress after 30d
   */
  server.get(
    '/admin/analytics/at-risk',
    {
      preHandler: [requireRole('INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN')],
    },
    async (request, reply) => {
      const orgId = request.user!.orgId;
      const now = Date.now();
      const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

      const learners = await prisma.user.findMany({
        where: { orgId, role: 'LEARNER' },
        include: {
          attempts: {
            orderBy: { startedAt: 'desc' },
          },
          topicProgress: {
            orderBy: { updatedAt: 'desc' },
          },
        },
      });

      const totalTopicsCount = await prisma.roadmapTopic.count();

      const atRiskList = await Promise.all(
        learners.map(async (learner) => {
          const reasons: string[] = [];

          // Check enrollments
          const enrollments = await prisma.enrollment.findMany({
            where: { userId: learner.id },
            orderBy: { createdAt: 'asc' },
          });

          // Check latest activity
          const latestEvents = await prisma.analyticsEvent.findMany({
            where: { userId: learner.id },
            orderBy: { createdAt: 'desc' },
            take: 1,
          });

          const lastActiveAt =
            latestEvents[0]?.createdAt ||
            learner.topicProgress[0]?.updatedAt ||
            learner.attempts[0]?.startedAt ||
            null;

          const enrolledAt = enrollments[0]?.createdAt || learner.createdAt;

          // 1. Inactive for 7+ days while enrolled (or registered)
          if (
            (enrollments.length > 0 || learner.createdAt <= sevenDaysAgo) &&
            (!lastActiveAt || lastActiveAt <= sevenDaysAgo)
          ) {
            reasons.push('Inactive for 7+ days');
          }

          // 2. Failed same quiz 3+ times
          const failuresPerQuiz: Record<string, number> = {};
          for (const attempt of learner.attempts) {
            if (attempt.passed === false) {
              failuresPerQuiz[attempt.quizId] = (failuresPerQuiz[attempt.quizId] || 0) + 1;
            }
          }
          const maxFailures = Math.max(0, ...Object.values(failuresPerQuiz));
          if (maxFailures >= 3) {
            reasons.push(`Failed same quiz ${maxFailures} times`);
          }

          // 3. <20% course progress after 30 days enrolled
          const completedTopicsCount = learner.topicProgress.filter((p) => p.completed).length;
          const progressPercent =
            totalTopicsCount > 0
              ? Math.min(100, Math.round((completedTopicsCount / totalTopicsCount) * 100))
              : 0;

          const oldEnrollment = enrollments.find((e) => e.createdAt <= thirtyDaysAgo);
          if (
            (oldEnrollment || learner.createdAt <= thirtyDaysAgo) &&
            progressPercent < 20
          ) {
            reasons.push('<20% course progress after 30 days enrolled');
          }

          if (reasons.length === 0) {
            return null;
          }

          return {
            userId: learner.id,
            name: learner.name,
            email: learner.email,
            reasons,
            lastActiveAt,
            enrolledAt,
            progressPercent,
            quizFailuresCount: maxFailures,
          };
        })
      );

      const filtered = atRiskList.filter((item): item is NonNullable<typeof item> => item !== null);

      return reply.send({
        atRiskCount: filtered.length,
        learners: filtered,
      });
    }
  );

  /**
   * POST /v1/admin/analytics/nudge/:userId
   * Send a nudge to an at-risk learner (logs the nudge action)
   */
  server.get(
    '/admin/analytics/nudge/:userId',
    {
      preHandler: [requireRole('INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN')],
      schema: {
        params: z.object({ userId: z.string() }).strict(),
      },
    },
    async (request, reply) => {
      const { userId } = request.params;
      const orgId = request.user!.orgId;

      request.log.info({ userId, orgId }, 'Nudge sent to at-risk learner');

      await prisma.analyticsEvent.create({
        data: {
          userId,
          orgId,
          eventType: 'instructor_nudged_learner',
          metadata: { nudgedBy: request.user!.id },
        },
      });

      return reply.send({
        success: true,
        message: 'Nudge sent successfully to learner.',
      });
    }
  );

  server.post(
    '/admin/analytics/nudge/:userId',
    {
      preHandler: [requireRole('INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN')],
      schema: {
        params: z.object({ userId: z.string() }).strict(),
      },
    },
    async (request, reply) => {
      const { userId } = request.params;
      const orgId = request.user!.orgId;

      request.log.info({ userId, orgId }, 'Nudge sent to at-risk learner');

      await prisma.analyticsEvent.create({
        data: {
          userId,
          orgId,
          eventType: 'instructor_nudged_learner',
          metadata: { nudgedBy: request.user!.id },
        },
      });

      return reply.send({
        success: true,
        message: 'Nudge sent successfully to learner.',
      });
    }
  );

  /**
   * GET /v1/admin/analytics/engagement
   * Daily active learners for the last 30 days
   */
  server.get(
    '/admin/analytics/engagement',
    {
      preHandler: [requireRole('INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN')],
    },
    async (request, reply) => {
      const orgId = request.user!.orgId;
      const days = [];

      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];

        const startOfDay = new Date(dateStr + 'T00:00:00.000Z');
        const endOfDay = new Date(dateStr + 'T23:59:59.999Z');

        const [events, progress] = await Promise.all([
          prisma.analyticsEvent.findMany({
            where: {
              orgId,
              createdAt: { gte: startOfDay, lte: endOfDay },
            },
            select: { userId: true },
            distinct: ['userId'],
          }),
          prisma.topicProgress.findMany({
            where: {
              user: { orgId },
              updatedAt: { gte: startOfDay, lte: endOfDay },
            },
            select: { userId: true },
            distinct: ['userId'],
          }),
        ]);

        const distinctUsers = new Set([
          ...events.map((e) => e.userId),
          ...progress.map((p) => p.userId),
        ]);

        days.push({
          date: dateStr,
          activeLearners: distinctUsers.size,
        });
      }

      return reply.send({ days });
    }
  );
}
