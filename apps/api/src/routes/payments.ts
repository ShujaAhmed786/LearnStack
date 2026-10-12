import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from 'db';
import { stripe, isStripeConfigured } from '../lib/stripe.js';
import { env } from '../env.js';

export async function paymentRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // ==========================================
  // 1. STRIPE WEBHOOK (No Auth Hook)
  // ==========================================
  app.post(
    '/webhooks/stripe',
    async (request, reply) => {
      const sig = request.headers['stripe-signature'] as string | undefined;
      let event: any;

      const rawBody = (request as any).rawBody;

      if (isStripeConfigured() && sig && env.STRIPE_WEBHOOK_SECRET && !env.STRIPE_WEBHOOK_SECRET.includes('placeholder')) {
        try {
          event = stripe.webhooks.constructEvent(
            rawBody || JSON.stringify(request.body),
            sig,
            env.STRIPE_WEBHOOK_SECRET
          );
        } catch (err: any) {
          app.log.error(`Stripe webhook signature verification failed: ${err.message}`);
          return reply.status(400).send({
            error: {
              message: `Webhook Error: ${err.message}`,
              code: 'WEBHOOK_SIGNATURE_INVALID',
            },
          });
        }
      } else {
        // Fallback for test / development mode
        event = request.body;
      }

      if (!event || !event.type) {
        return reply.status(400).send({ error: { message: 'Invalid webhook payload', code: 'INVALID_PAYLOAD' } });
      }

      // Handle checkout.session.completed
      if (event.type === 'checkout.session.completed') {
        const session = event.data?.object;
        if (session) {
          const sessionId = session.id;
          const paymentIntent = session.payment_intent ? String(session.payment_intent) : null;
          const userId = session.metadata?.userId || session.client_reference_id;
          const courseId = session.metadata?.courseId;
          const orgId = session.metadata?.orgId || session.metadata?.org_id;

          if (sessionId) {
            // Update purchase record
            await prisma.purchase.updateMany({
              where: { stripeSessionId: sessionId },
              data: {
                status: 'COMPLETED',
                stripePaymentId: paymentIntent,
              },
            });
          }

          if (userId && courseId) {
            // Create or upsert enrollment
            await prisma.enrollment.upsert({
              where: {
                userId_courseId: {
                  userId,
                  courseId,
                },
              },
              create: {
                userId,
                courseId,
                orgId: orgId || '',
              },
              update: {},
            });
            app.log.info(`Enrolled user ${userId} into course ${courseId} via Stripe checkout webhook`);
          }
        }
      }

      return reply.send({ received: true });
    }
  );

  // ==========================================
  // Authenticated Payment & Enrollment Routes
  // ==========================================
  const protectedRoutes = fastify.withTypeProvider<ZodTypeProvider>();
  protectedRoutes.addHook('preHandler', fastify.authenticate);

  // POST /v1/courses/:slug/checkout (and aliased /v1/roadmaps/:slug/checkout)
  const checkoutHandler = async (
    request: any,
    reply: any
  ) => {
    const { slug } = request.params;
    const userId = request.user!.id;
    const orgId = request.orgId || request.user!.orgId || '';

    // Find course / roadmap
    const course = await prisma.roadmap.findFirst({
      where: {
        slug,
        OR: [
          { orgId: null },
          { orgId: request.orgId! },
        ],
      },
    });

    if (!course) {
      return reply.status(404).send({
        error: { message: 'Course not found', code: 'COURSE_NOT_FOUND' },
      });
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: course.id,
        },
      },
    });

    if (existingEnrollment) {
      return reply.send({
        enrolled: true,
        alreadyEnrolled: true,
        url: `${env.CORS_ORIGIN}/courses/${course.slug}`,
        message: 'Already enrolled in this course',
      });
    }

    // Find active product for course
    const product = await prisma.product.findFirst({
      where: {
        courseId: course.id,
        active: true,
      },
    });

    // If free course (no product or price is 0)
    if (!product || product.priceCents === 0) {
      // Auto-enroll user in free course
      await prisma.enrollment.upsert({
        where: {
          userId_courseId: {
            userId,
            courseId: course.id,
          },
        },
        create: {
          userId,
          courseId: course.id,
          orgId: course.orgId || orgId,
        },
        update: {},
      });

      return reply.send({
        enrolled: true,
        free: true,
        url: `${env.CORS_ORIGIN}/purchase/success?course=${course.slug}&free=true`,
      });
    }

    // Paid course: Create Stripe checkout session
    const successUrl = `${env.CORS_ORIGIN}/purchase/success?session_id={CHECKOUT_SESSION_ID}&course=${course.slug}`;
    const cancelUrl = `${env.CORS_ORIGIN}/purchase/cancelled?course=${course.slug}`;

    if (isStripeConfigured()) {
      try {
        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          line_items: [
            {
              price_data: {
                currency: product.currency,
                product_data: {
                  name: course.title,
                  description: course.description || `Full access to ${course.title} course on LearnStack`,
                },
                unit_amount: product.priceCents,
              },
              quantity: 1,
            },
          ],
          client_reference_id: userId,
          metadata: {
            userId,
            courseId: course.id,
            productId: product.id,
            orgId: course.orgId || orgId,
          },
          success_url: successUrl,
          cancel_url: cancelUrl,
        });

        // Create pending purchase
        await prisma.purchase.create({
          data: {
            userId,
            productId: product.id,
            stripeSessionId: session.id,
            amountCents: product.priceCents,
            currency: product.currency,
            status: 'PENDING',
          },
        });

        return reply.send({
          url: session.url,
          sessionId: session.id,
          enrolled: false,
        });
      } catch (stripeErr: any) {
        app.log.error(`Stripe error: ${stripeErr.message}`);
        // If Stripe fails with test credentials, fall through to simulation in dev
        if (env.NODE_ENV === 'production') {
          return reply.status(500).send({
            error: { message: stripeErr.message || 'Payment initiation failed', code: 'PAYMENT_FAILED' },
          });
        }
      }
    }

    // Sandbox / Test Mode fallback (when STRIPE_SECRET_KEY is test mock)
    const mockSessionId = `test_cs_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    await prisma.purchase.create({
      data: {
        userId,
        productId: product.id,
        stripeSessionId: mockSessionId,
        amountCents: product.priceCents,
        currency: product.currency,
        status: 'PENDING',
      },
    });

    const mockSuccessUrl = `${env.CORS_ORIGIN}/purchase/success?session_id=${mockSessionId}&course=${course.slug}&test_mode=true`;

    return reply.send({
      url: mockSuccessUrl,
      sessionId: mockSessionId,
      enrolled: false,
      testMode: true,
    });
  };

  protectedRoutes.post(
    '/courses/:slug/checkout',
    {
      schema: {
        params: z.object({ slug: z.string() }),
      },
    },
    checkoutHandler
  );

  protectedRoutes.post(
    '/roadmaps/:slug/checkout',
    {
      schema: {
        params: z.object({ slug: z.string() }),
      },
    },
    checkoutHandler
  );

  // POST /v1/purchases/confirm - confirms session and guarantees enrollment
  protectedRoutes.post(
    '/purchases/confirm',
    {
      schema: {
        body: z.object({
          sessionId: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { sessionId } = request.body;
      const userId = request.user!.id;

      // Find purchase
      const purchase = await prisma.purchase.findFirst({
        where: {
          stripeSessionId: sessionId,
          userId,
        },
      });

      if (!purchase) {
        return reply.status(404).send({
          error: { message: 'Purchase session not found', code: 'PURCHASE_NOT_FOUND' },
        });
      }

      // Mark purchase completed
      await prisma.purchase.update({
        where: { id: purchase.id },
        data: { status: 'COMPLETED' },
      });

      // Find product to get courseId
      const product = await prisma.product.findUnique({
        where: { id: purchase.productId },
      });

      if (!product) {
        return reply.status(404).send({
          error: { message: 'Product not found', code: 'PRODUCT_NOT_FOUND' },
        });
      }

      // Create or ensure enrollment
      const enrollment = await prisma.enrollment.upsert({
        where: {
          userId_courseId: {
            userId,
            courseId: product.courseId,
          },
        },
        create: {
          userId,
          courseId: product.courseId,
          orgId: product.orgId || request.orgId || '',
        },
        update: {},
      });

      // Find course slug
      const course = await prisma.roadmap.findUnique({
        where: { id: product.courseId },
      });

      return reply.send({
        success: true,
        enrolled: true,
        enrollmentId: enrollment.id,
        courseSlug: course?.slug || '',
        courseTitle: course?.title || '',
      });
    }
  );

  // GET /v1/enrollments - current user's enrolled courses
  protectedRoutes.get('/enrollments', async (request, reply) => {
    const userId = request.user!.id;

    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const courseIds = enrollments.map((e) => e.courseId);

    const courses = await prisma.roadmap.findMany({
      where: { id: { in: courseIds } },
      include: {
        stages: {
          include: {
            topics: {
              select: { id: true },
            },
          },
        },
      },
    });

    // Check user topic progress
    const allTopicIds = courses.flatMap((c) =>
      c.stages.flatMap((s) => s.topics.map((t) => t.id))
    );

    const userProgress = await prisma.topicProgress.findMany({
      where: {
        userId,
        topicId: { in: allTopicIds },
        completed: true,
      },
      select: { topicId: true },
    });

    const completedSet = new Set(userProgress.map((p) => p.topicId));

    const courseMap = new Map(
      courses.map((c) => {
        const total = c.stages.flatMap((s) => s.topics).length;
        const completed = c.stages
          .flatMap((s) => s.topics)
          .filter((t) => completedSet.has(t.id)).length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        return [
          c.id,
          {
            ...c,
            totalTopics: total,
            completedTopics: completed,
            percentComplete: percent,
            isEnrolled: true,
          },
        ];
      })
    );

    const result = enrollments.map((enrollment) => ({
      id: enrollment.id,
      userId: enrollment.userId,
      courseId: enrollment.courseId,
      orgId: enrollment.orgId,
      createdAt: enrollment.createdAt,
      course: courseMap.get(enrollment.courseId) || null,
    }));

    return reply.send(result);
  });

  // GET /v1/courses/:slug/enrollment - check status for a specific course
  protectedRoutes.get(
    '/courses/:slug/enrollment',
    {
      schema: {
        params: z.object({ slug: z.string() }),
      },
    },
    async (request, reply) => {
      const { slug } = request.params;
      const userId = request.user!.id;

      const course = await prisma.roadmap.findFirst({
        where: {
          slug,
          OR: [{ orgId: null }, { orgId: request.orgId! }],
        },
      });

      if (!course) {
        return reply.status(404).send({
          error: { message: 'Course not found', code: 'COURSE_NOT_FOUND' },
        });
      }

      const product = await prisma.product.findFirst({
        where: { courseId: course.id, active: true },
      });

      const isFree = !product || product.priceCents === 0;

      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: course.id,
          },
        },
      });

      const isStaff =
        request.user?.role === 'ORG_ADMIN' ||
        request.user?.role === 'INSTRUCTOR' ||
        request.user?.role === 'SUPER_ADMIN';

      return reply.send({
        courseId: course.id,
        courseSlug: course.slug,
        isEnrolled: Boolean(enrollment) || isStaff,
        isFree,
        priceCents: product?.priceCents || null,
        currency: product?.currency || 'usd',
      });
    }
  );
}
