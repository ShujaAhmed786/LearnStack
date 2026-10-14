import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { prisma, User, Organization, Role } from 'db';

export interface SessionData {
  userId: string;
  orgId: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: User & { org: Organization };
    orgId?: string;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export function setSessionCookie(reply: FastifyReply, data: SessionData, isProduction: boolean) {
  reply.setCookie('session', JSON.stringify(data), {
    path: '/',
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    signed: true,
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export function clearSessionCookie(reply: FastifyReply) {
  reply.clearCookie('session', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
  });
}

export function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
      });
    }

    if (request.user.role !== 'SUPER_ADMIN' && !roles.includes(request.user.role)) {
      return reply.status(403).send({
        error: {
          message: 'Insufficient permissions',
          code: 'FORBIDDEN',
        },
      });
    }
  };
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', async (request: FastifyRequest) => {
    if (request.user) return;
    const rawCookie = request.cookies.session;
    if (!rawCookie) return;

    const unsigned = request.unsignCookie(rawCookie);
    if (!unsigned.valid || !unsigned.value) return;

    try {
      const data: SessionData = JSON.parse(unsigned.value);
      if (!data.userId || !data.orgId) return;

      const user = await prisma.user.findFirst({
        where: {
          id: data.userId,
          orgId: data.orgId,
          active: true,
          deletedAt: null,
        },
        include: {
          org: true,
        },
      });

      if (user) {
        request.user = user;
        request.orgId = user.orgId;
      }
    } catch (err) {
      // Invalid session, ignore but don't swallow silently in dev
      if (process.env.NODE_ENV !== 'production') {
        console.debug('Invalid session:', err);
      }
    }
  });

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    const rawCookie = request.cookies.session;
    if (!rawCookie) {
      return reply.status(401).send({
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
      });
    }

    const unsigned = request.unsignCookie(rawCookie);
    if (!unsigned.valid || !unsigned.value) {
      return reply.status(401).send({
        error: {
          message: 'Invalid or expired session',
          code: 'INVALID_SESSION',
        },
      });
    }

    try {
      const data: SessionData = JSON.parse(unsigned.value);
      if (!data.userId || !data.orgId) {
        return reply.status(401).send({
          error: {
            message: 'Invalid session payload',
            code: 'INVALID_SESSION',
          },
        });
      }

      // Tenant isolation: fetch user guaranteeing orgId matches session and account is active
      const user = await prisma.user.findFirst({
        where: {
          id: data.userId,
          orgId: data.orgId,
          active: true,
          deletedAt: null,
        },
        include: {
          org: true,
        },
      });

      if (!user) {
        // The session cookie is validly signed but no active user matches the
        // (userId, orgId) pair. Check whether the user still exists under a
        // different org (e.g. moved orgs) so the client can prompt a clean
        // re-login instead of showing a confusing error.
        const userById = await prisma.user.findFirst({
          where: {
            id: data.userId,
            active: true,
            deletedAt: null,
          },
          select: { orgId: true },
        });

        clearSessionCookie(reply);

        if (userById && userById.orgId !== data.orgId) {
          return reply.status(401).send({
            error: {
              message: 'Your session expired, please log in again',
              code: 'SESSION_ORG_MISMATCH',
            },
          });
        }

        return reply.status(401).send({
          error: {
            message: 'User or organization not found',
            code: 'USER_NOT_FOUND',
          },
        });
      }

      request.user = user;
      request.orgId = user.orgId;
    } catch {
      return reply.status(401).send({
        error: {
          message: 'Failed to authenticate session',
          code: 'UNAUTHORIZED',
        },
      });
    }
  });
};

export default fp(authPlugin);
