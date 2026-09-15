import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import { authenticateRequest, hasRole } from './lib/auth.js';
import { cropRoutes } from './routes/crops.js';
import { cultivarRoutes } from './routes/cultivars.js';
import { descriptorRoutes } from './routes/descriptors.js';
import { materialRoutes } from './routes/materials.js';
import { lotRoutes } from './routes/lots.js';
import { varietalValueRoutes } from './routes/varietalValues.js';
import { accountRoutes } from './routes/account.js';

type Authenticator = (request: FastifyRequest, reply: FastifyReply) => Promise<unknown> | unknown;

type BuildAppOptions = {
  logger?: boolean;
  authenticate?: Authenticator;
};

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({ logger: options.logger ?? true });
  const authenticate = options.authenticate ?? authenticateRequest;

  app.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(',').map((value) => value.trim()) ?? true
  });

  app.get('/health', async () => ({
    status: 'ok',
    service: 'seedtrace-pf-backend',
    version: '0.1.0-alpha'
  }));

  app.addHook('preHandler', async (request, reply) => {
    if (!request.url.startsWith('/api/')) return;

    await authenticate(request, reply);
    if (reply.sent) return;

    const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
    if (isWrite && !hasRole(request, ['admin', 'manager', 'technician'])) {
      return reply.code(403).send({ error: 'Write permission required' });
    }
  });

  app.register(accountRoutes, { prefix: '/api/account' });
  app.register(cropRoutes, { prefix: '/api/crops' });
  app.register(cultivarRoutes, { prefix: '/api/cultivars' });
  app.register(descriptorRoutes, { prefix: '/api/descriptors' });
  app.register(varietalValueRoutes, { prefix: '/api/varietal-values' });
  app.register(materialRoutes, { prefix: '/api/materials' });
  app.register(lotRoutes, { prefix: '/api/lots' });

  return app;
}
