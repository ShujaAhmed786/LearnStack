import fastify, { FastifyError, FastifyRequest } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { env } from './env.js';
import authPlugin from './plugins/auth.js';
import { authRoutes } from './routes/auth.js';
import { orgsRoutes } from './routes/orgs.js';
import { contentRoutes } from './routes/content.js';
import { quizRoutes } from './routes/quizzes.js';
import { uploadRoutes } from './routes/uploads.js';
import { progressRoutes } from './routes/progress.js';
import { roadmapRoutes } from './routes/roadmaps.js';
import { practiceRoutes } from './routes/practices.js';
import { adminRoutes } from './routes/admin.js';
import { certificateRoutes } from './routes/certificates.js';
import { liveSessionRoutes } from './routes/live-sessions.js';
import { discussionRoutes } from './routes/discussions.js';
import { analyticsRoutes } from './routes/analytics.js';

async function bootstrap() {
  const app = fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      redact: [
        'req.headers.authorization',
        'req.headers.cookie',
        'body.password',
        '*.password',
      ],
      transport:
        env.NODE_ENV !== 'production'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
  });

  // Configure Zod schema compiler
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    try {
      (req as FastifyRequest & { rawBody: Buffer }).rawBody = body as Buffer;
      const json = JSON.parse(body.toString());
      done(null, json);
    } catch (err: any) {
      err.statusCode = 400;
      done(err, undefined);
    }
  });

  // Global Error Handler - never leak stack traces
  app.setErrorHandler((error: FastifyError, _request, reply) => {
    app.log.error(error);

    if (error.validation) {
      return reply.status(400).send({
        error: {
          message: error.message || 'Validation error',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    if (error.statusCode && error.statusCode < 500) {
      return reply.status(error.statusCode).send({
        error: {
          message: error.message,
          code: error.code || 'BAD_REQUEST',
        },
      });
    }

    return reply.status(500).send({
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      },
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send({
      error: {
        message: 'Route not found',
        code: 'NOT_FOUND',
      },
    });
  });

  // Plugins
  await app.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production',
  });

  await app.register(cors, {
    origin: env.NODE_ENV === 'production'
      ? [env.CORS_ORIGIN]
      : [env.CORS_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  await app.register(cookie, {
    secret: env.SESSION_SECRET,
    hook: 'onRequest',
  });

  // Multipart File Upload Support
  await app.register(multipart, {
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB
    },
  });

  // Auth Plugin
  await app.register(authPlugin);

  // Routes
  await app.register(authRoutes, { prefix: '/v1/auth' });
  await app.register(orgsRoutes, { prefix: '/v1/orgs' });
  await app.register(contentRoutes, { prefix: '/v1' });
  await app.register(quizRoutes, { prefix: '/v1' });
  await app.register(uploadRoutes, { prefix: '/v1' });
  await app.register(progressRoutes, { prefix: '/v1' });
  await app.register(roadmapRoutes, { prefix: '/v1' });
  await app.register(practiceRoutes, { prefix: '/v1' });
  await app.register(adminRoutes, { prefix: '/v1' });
  await app.register(certificateRoutes, { prefix: '/v1' });
  await app.register(liveSessionRoutes, { prefix: '/v1' });
  await app.register(discussionRoutes, { prefix: '/v1' });
  await app.register(analyticsRoutes, { prefix: '/v1' });

  // Health check (tests DB connectivity)
  app.get('/health', async () => {
    try {
      const { prisma } = await import('db');
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'connected' };
    } catch {
      return { status: 'degraded', database: 'disconnected' };
    }
  });

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`Server listening on port ${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown for ECS
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down gracefully`);
    try {
      await app.close();
      app.log.info('Server closed');
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap();
