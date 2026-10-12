import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from 'db';

export async function orgsRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // Public org branding
  app.get(
    '/:slug',
    {
      schema: {
        params: z
          .object({
            slug: z.string().min(1),
          })
          .strict(),
      },
    },
    async (request, reply) => {
      const { slug } = request.params;

      const org = await prisma.organization.findUnique({
        where: { slug },
        select: {
          name: true,
          slug: true,
          logoUrl: true,
          primaryColor: true,
        },
      });

      if (!org) {
        return reply.status(404).send({
          error: {
            message: 'Organization not found',
            code: 'ORG_NOT_FOUND',
          },
        });
      }

      return reply.send(org);
    }
  );
}
