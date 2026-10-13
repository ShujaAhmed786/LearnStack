import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma, QuestionType } from 'db';
import { requireRole } from '../plugins/auth.js';

export async function quizRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // All quiz routes require authentication
  app.addHook('preHandler', fastify.authenticate);

  // ==========================================
  // QUIZZES
  // ==========================================

  // POST /v1/quizzes (ORG_ADMIN, INSTRUCTOR)
  app.post(
    '/quizzes',
    {
      preHandler: [requireRole('ORG_ADMIN', 'INSTRUCTOR')],
      schema: {
        body: z
          .object({
            title: z.string().min(1, 'Title is required').trim(),
            description: z.string().optional().nullable(),
            topicId: z.string().optional().nullable(),
            timeLimitMinutes: z.number().int().positive().optional().nullable(),
            passingScore: z.number().min(0).max(100).optional().default(70),
          })
          .strict(),
      },
    },
    async (request, reply) => {
      const { title, description, topicId, timeLimitMinutes, passingScore } = request.body;

      // Validate topic if provided
      if (topicId) {
        const topic = await prisma.topic.findFirst({
          where: { id: topicId, orgId: request.orgId! },
        });
        if (!topic) {
          return reply.status(404).send({
            error: {
              message: 'Associated topic not found',
              code: 'NOT_FOUND',
            },
          });
        }
      }

      const quiz = await prisma.quiz.create({
        data: {
          title,
          description: description || null,
          topicId: topicId || null,
          timeLimitMinutes: timeLimitMinutes || null,
          passingScore: passingScore ?? 70,
          orgId: request.orgId!,
        },
        include: {
          topic: {
            select: { id: true, title: true },
          },
          _count: {
            select: { questions: true, attempts: true },
          },
        },
      });

      return reply.status(201).send(quiz);
    }
  );

  // GET /v1/quizzes - list
  app.get('/quizzes', async (request, reply) => {
    const isInstructorOrAdmin =
      request.user!.role === 'ORG_ADMIN' ||
      request.user!.role === 'INSTRUCTOR' ||
      request.user!.role === 'SUPER_ADMIN';

    const quizzes = await prisma.quiz.findMany({
      where: { orgId: request.orgId! },
      include: {
        topic: {
          select: { id: true, title: true },
        },
        _count: {
          select: { questions: true, attempts: true },
        },
        attempts: {
          where: { userId: request.user!.id },
          orderBy: { startedAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Attach learner's best score and last attempt
    const formatted = quizzes.map((q) => {
      const userAttempts = q.attempts;
      const completedAttempts = userAttempts.filter((a) => a.score !== null);
      const bestScore =
        completedAttempts.length > 0
          ? Math.max(...completedAttempts.map((a) => a.score!))
          : null;
      const lastAttempt = userAttempts[0] || null;

      return {
        id: q.id,
        title: q.title,
        description: q.description,
        topicId: q.topicId,
        topic: q.topic,
        orgId: q.orgId,
        timeLimitMinutes: q.timeLimitMinutes,
        passingScore: q.passingScore,
        createdAt: q.createdAt,
        _count: q._count,
        bestScore,
        lastAttempt,
      };
    });

    return reply.send(formatted);
  });

  // GET /v1/quizzes/:id - for learners: questions WITHOUT correctAnswer; for instructors: full
  app.get(
    '/quizzes/:id',
    {
      schema: {
        params: z.object({ id: z.string() }).strict(),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const isInstructorOrAdmin =
        request.user!.role === 'ORG_ADMIN' ||
        request.user!.role === 'INSTRUCTOR' ||
        request.user!.role === 'SUPER_ADMIN';

      let quiz = await prisma.quiz.findFirst({
        where: { id, orgId: request.orgId! },
        include: {
          topic: {
            select: { id: true, title: true },
          },
          questions: {
            orderBy: { order: 'asc' },
          },
          attempts: {
            where: { userId: request.user!.id },
            orderBy: { startedAt: 'desc' },
          },
        },
      });

      if (!quiz) {
        // Check if this is a global roadmap quiz
        const linkedTopic = await prisma.roadmapTopic.findFirst({
          where: { quizId: id },
        });
        if (linkedTopic) {
          quiz = await prisma.quiz.findUnique({
            where: { id },
            include: {
              topic: {
                select: { id: true, title: true },
              },
              questions: {
                orderBy: { order: 'asc' },
              },
              attempts: {
                where: { userId: request.user!.id },
                orderBy: { startedAt: 'desc' },
              },
            },
          });
        }
      }

      if (!quiz) {
        return reply.status(404).send({
          error: {
            message: 'Quiz not found',
            code: 'NOT_FOUND',
          },
        });
      }

      // Security requirement: learners cannot see correctAnswer or explanation before submitting
      const sanitizedQuestions = quiz.questions.map((q) => {
        if (isInstructorOrAdmin) {
          return q;
        }
        return {
          id: q.id,
          quizId: q.quizId,
          text: q.text,
          type: q.type,
          options: q.options,
          points: q.points,
          order: q.order,
          // correctAnswer and explanation omitted
        };
      });

      const completedAttempts = quiz.attempts.filter((a) => a.score !== null);
      const bestScore =
        completedAttempts.length > 0
          ? Math.max(...completedAttempts.map((a) => a.score!))
          : null;

      return reply.send({
        ...quiz,
        questions: sanitizedQuestions,
        bestScore,
      });
    }
  );

  // PATCH /v1/quizzes/:id (ORG_ADMIN, INSTRUCTOR)
  app.patch(
    '/quizzes/:id',
    {
      preHandler: [requireRole('ORG_ADMIN', 'INSTRUCTOR')],
      schema: {
        params: z.object({ id: z.string() }).strict(),
        body: z
          .object({
            title: z.string().min(1).trim().optional(),
            description: z.string().optional().nullable(),
            topicId: z.string().optional().nullable(),
            timeLimitMinutes: z.number().int().positive().optional().nullable(),
            passingScore: z.number().min(0).max(100).optional(),
          })
          .strict(),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { title, description, topicId, timeLimitMinutes, passingScore } = request.body;

      const quiz = await prisma.quiz.findFirst({
        where: { id, orgId: request.orgId! },
      });

      if (!quiz) {
        return reply.status(404).send({
          error: {
            message: 'Quiz not found',
            code: 'NOT_FOUND',
          },
        });
      }

      const updated = await prisma.quiz.update({
        where: { id },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(topicId !== undefined && { topicId }),
          ...(timeLimitMinutes !== undefined && { timeLimitMinutes }),
          ...(passingScore !== undefined && { passingScore }),
        },
      });

      return reply.send(updated);
    }
  );

  // DELETE /v1/quizzes/:id (ORG_ADMIN)
  app.delete(
    '/quizzes/:id',
    {
      preHandler: [requireRole('ORG_ADMIN')],
      schema: {
        params: z.object({ id: z.string() }).strict(),
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const quiz = await prisma.quiz.findFirst({
        where: { id, orgId: request.orgId! },
      });

      if (!quiz) {
        return reply.status(404).send({
          error: {
            message: 'Quiz not found',
            code: 'NOT_FOUND',
          },
        });
      }

      await prisma.quiz.delete({
        where: { id },
      });

      return reply.send({ success: true });
    }
  );

  // ==========================================
  // QUESTIONS
  // ==========================================

  // POST /v1/quizzes/:id/questions (ORG_ADMIN, INSTRUCTOR) - bulk create questions
  app.post(
    '/quizzes/:id/questions',
    {
      preHandler: [requireRole('ORG_ADMIN', 'INSTRUCTOR')],
      schema: {
        params: z.object({ id: z.string() }).strict(),
        body: z
          .object({
            questions: z.array(
              z
                .object({
                  text: z.string().min(1, 'Question text is required'),
                  type: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER']),
                  options: z.array(z.string()).default([]),
                  correctAnswer: z.string().min(1, 'Correct answer is required'),
                  explanation: z.string().optional().nullable(),
                  points: z.number().int().min(1).default(1),
                  order: z.number().int().default(0),
                })
                .strict()
            ),
          })
          .strict(),
      },
    },
    async (request, reply) => {
      const { id: quizId } = request.params;
      const { questions } = request.body;

      const quiz = await prisma.quiz.findFirst({
        where: { id: quizId, orgId: request.orgId! },
      });

      if (!quiz) {
        return reply.status(404).send({
          error: {
            message: 'Quiz not found',
            code: 'NOT_FOUND',
          },
        });
      }

      const createdQuestions = await prisma.$transaction(
        questions.map((q) =>
          prisma.question.create({
            data: {
              quizId,
              text: q.text,
              type: q.type as QuestionType,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation || null,
              points: q.points ?? 1,
              order: q.order ?? 0,
            },
          })
        )
      );

      return reply.status(201).send(createdQuestions);
    }
  );

  // DELETE /v1/quizzes/:id/questions/:questionId (ORG_ADMIN, INSTRUCTOR)
  app.delete(
    '/quizzes/:id/questions/:questionId',
    {
      preHandler: [requireRole('ORG_ADMIN', 'INSTRUCTOR')],
      schema: {
        params: z
          .object({
            id: z.string(),
            questionId: z.string(),
          })
          .strict(),
      },
    },
    async (request, reply) => {
      const { id: quizId, questionId } = request.params;

      const quiz = await prisma.quiz.findFirst({
        where: { id: quizId, orgId: request.orgId! },
      });

      if (!quiz) {
        return reply.status(404).send({
          error: {
            message: 'Quiz not found',
            code: 'NOT_FOUND',
          },
        });
      }

      await prisma.question.delete({
        where: { id: questionId },
      });

      return reply.send({ success: true });
    }
  );

  // ==========================================
  // ATTEMPTS & AUTO-GRADING
  // ==========================================

  // POST /v1/quizzes/:id/start - creates attempt, returns questions (no answers)
  app.post(
    '/quizzes/:id/start',
    {
      schema: {
        params: z.object({ id: z.string() }).strict(),
      },
    },
    async (request, reply) => {
      const { id: quizId } = request.params;

      let quiz = await prisma.quiz.findFirst({
        where: { id: quizId, orgId: request.orgId! },
        include: {
          questions: {
            orderBy: { order: 'asc' },
          },
        },
      });

      if (!quiz) {
        const linkedTopic = await prisma.roadmapTopic.findFirst({
          where: { quizId },
        });
        if (linkedTopic) {
          quiz = await prisma.quiz.findUnique({
            where: { id: quizId },
            include: {
              questions: {
                orderBy: { order: 'asc' },
              },
            },
          });
        }
      }

      if (!quiz) {
        return reply.status(404).send({
          error: {
            message: 'Quiz not found',
            code: 'NOT_FOUND',
          },
        });
      }

      if (quiz.questions.length === 0) {
        return reply.status(400).send({
          error: {
            message: 'This quiz has no questions yet',
            code: 'NO_QUESTIONS',
          },
        });
      }

      // Create new QuizAttempt
      const attempt = await prisma.quizAttempt.create({
        data: {
          quizId,
          userId: request.user!.id,
          orgId: request.orgId!,
          answers: {},
          startedAt: new Date(),
        },
      });

      // Scrub answers for learner
      const questions = quiz.questions.map((q) => ({
        id: q.id,
        quizId: q.quizId,
        text: q.text,
        type: q.type,
        options: q.options,
        points: q.points,
        order: q.order,
      }));

      return reply.status(201).send({
        attemptId: attempt.id,
        quiz: {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          timeLimitMinutes: quiz.timeLimitMinutes,
          passingScore: quiz.passingScore,
        },
        startedAt: attempt.startedAt,
        questions,
      });
    }
  );

  // POST /v1/attempts/:id/submit - answers as JSON, auto-grades, returns score + per-question feedback
  app.post(
    '/attempts/:id/submit',
    {
      schema: {
        params: z.object({ id: z.string() }).strict(),
        body: z
          .object({
            answers: z.record(z.string()), // { [questionId]: answerString }
          })
          .strict(),
      },
    },
    async (request, reply) => {
      const { id: attemptId } = request.params;
      const { answers } = request.body;

      const attempt = await prisma.quizAttempt.findFirst({
        where: {
          id: attemptId,
          userId: request.user!.id,
          orgId: request.orgId!,
        },
        include: {
          quiz: {
            include: {
              questions: {
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      });

      if (!attempt) {
        return reply.status(404).send({
          error: {
            message: 'Attempt not found',
            code: 'NOT_FOUND',
          },
        });
      }

      if (attempt.completedAt) {
        return reply.status(400).send({
          error: {
            message: 'Attempt has already been submitted',
            code: 'ALREADY_SUBMITTED',
          },
        });
      }

      const questions = attempt.quiz.questions;
      let totalPoints = 0;
      let earnedPoints = 0;

      const feedback = questions.map((q) => {
        totalPoints += q.points;
        const userAnswer = (answers[q.id] || '').trim();
        const correctAnswer = q.correctAnswer.trim();

        let isCorrect = false;

        if (q.type === 'SHORT_ANSWER') {
          // Short answer: case-insensitive trimmed match
          isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
        } else {
          // Multiple choice and True/False: exact match
          isCorrect = userAnswer === correctAnswer;
        }

        const pointsEarned = isCorrect ? q.points : 0;
        earnedPoints += pointsEarned;

        return {
          questionId: q.id,
          questionText: q.text,
          userAnswer,
          correctAnswer: q.correctAnswer,
          isCorrect,
          pointsEarned,
          pointsPossible: q.points,
          explanation: q.explanation,
        };
      });

      // Score = (correct points / total points) * 100
      const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 100;
      const roundedScore = Math.round(score * 10) / 10;
      const passed = roundedScore >= attempt.quiz.passingScore;

      // Update attempt in DB
      await prisma.quizAttempt.update({
        where: { id: attemptId },
        data: {
          answers,
          score: roundedScore,
          passed,
          completedAt: new Date(),
        },
      });

      // Spec 09: Auto-mark roadmap topic complete after passing (>= 70%)
      if (passed) {
        const roadmapTopic = await prisma.roadmapTopic.findFirst({
          where: { quizId: attempt.quizId },
        });

        if (roadmapTopic) {
          await prisma.topicProgress.upsert({
            where: {
              userId_topicId: {
                userId: request.user!.id,
                topicId: roadmapTopic.id,
              },
            },
            update: { completed: true },
            create: {
              userId: request.user!.id,
              topicId: roadmapTopic.id,
              completed: true,
            },
          });
        }
      }

      return reply.send({
        attemptId,
        score: roundedScore,
        passed,
        totalPoints,
        earnedPoints,
        feedback,
      });
    }
  );

  // GET /v1/attempts/:id - get attempt details & feedback
  app.get(
    '/attempts/:id',
    {
      schema: {
        params: z.object({ id: z.string() }).strict(),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const isInstructorOrAdmin =
        request.user!.role === 'ORG_ADMIN' ||
        request.user!.role === 'INSTRUCTOR' ||
        request.user!.role === 'SUPER_ADMIN';

      const attempt = await prisma.quizAttempt.findFirst({
        where: {
          id,
          orgId: request.orgId!,
          ...(!isInstructorOrAdmin && { userId: request.user!.id }),
        },
        include: {
          quiz: {
            include: {
              questions: {
                orderBy: { order: 'asc' },
              },
            },
          },
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (!attempt) {
        return reply.status(404).send({
          error: {
            message: 'Attempt not found',
            code: 'NOT_FOUND',
          },
        });
      }

      // Generate feedback if attempt is completed
      const answersMap = (attempt.answers as Record<string, string>) || {};
      const feedback = attempt.completedAt
        ? attempt.quiz.questions.map((q) => {
            const userAnswer = (answersMap[q.id] || '').trim();
            const correctAnswer = q.correctAnswer.trim();

            const isCorrect =
              q.type === 'SHORT_ANSWER'
                ? userAnswer.toLowerCase() === correctAnswer.toLowerCase()
                : userAnswer === correctAnswer;

            return {
              questionId: q.id,
              questionText: q.text,
              userAnswer,
              correctAnswer: q.correctAnswer,
              isCorrect,
              pointsEarned: isCorrect ? q.points : 0,
              pointsPossible: q.points,
              explanation: q.explanation,
            };
          })
        : null;

      // C7: Strip correct answers from questions unless completed or staff
      // (prevents learners from reading answers before submitting)
      const canSeeAnswers = !!attempt.completedAt || isInstructorOrAdmin;
      const sanitizedAttempt = {
        ...attempt,
        quiz: {
          ...attempt.quiz,
          questions: attempt.quiz.questions.map((q) => {
            if (canSeeAnswers) return q;
            const { correctAnswer, explanation, ...rest } = q;
            return rest;
          }),
        },
      };

      return reply.send({
        ...sanitizedAttempt,
        feedback,
      });
    }
  );

  // GET /v1/quizzes/:id/attempts - learner's own attempts; instructors see all for their org
  app.get(
    '/quizzes/:id/attempts',
    {
      schema: {
        params: z.object({ id: z.string() }).strict(),
      },
    },
    async (request, reply) => {
      const { id: quizId } = request.params;
      const isInstructorOrAdmin =
        request.user!.role === 'ORG_ADMIN' ||
        request.user!.role === 'INSTRUCTOR' ||
        request.user!.role === 'SUPER_ADMIN';

      let quiz = await prisma.quiz.findFirst({
        where: { id: quizId, orgId: request.orgId! },
      });

      if (!quiz) {
        const linkedTopic = await prisma.roadmapTopic.findFirst({
          where: { quizId },
        });
        if (linkedTopic) {
          quiz = await prisma.quiz.findUnique({
            where: { id: quizId },
          });
        }
      }

      if (!quiz) {
        return reply.status(404).send({
          error: {
            message: 'Quiz not found',
            code: 'NOT_FOUND',
          },
        });
      }

      const attempts = await prisma.quizAttempt.findMany({
        where: {
          quizId,
          ...(!isInstructorOrAdmin && { userId: request.user!.id }),
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { startedAt: 'desc' },
      });

      return reply.send(attempts);
    }
  );
}
