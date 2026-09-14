import type { FastifyInstance } from 'fastify';

export async function accountRoutes(app: FastifyInstance) {
  app.get('/me', async (request, reply) => {
    if (!request.authUser) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    return request.authUser;
  });
}
