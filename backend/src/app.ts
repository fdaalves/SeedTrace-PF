import Fastify from 'fastify';
import cors from '@fastify/cors';
import { cropRoutes } from './routes/crops.js';
import { cultivarRoutes } from './routes/cultivars.js';
import { descriptorRoutes } from './routes/descriptors.js';
import { materialRoutes } from './routes/materials.js';
import { lotRoutes } from './routes/lots.js';
import { varietalValueRoutes } from './routes/varietalValues.js';

export function buildApp(options: { logger?: boolean } = {}) {
  const app = Fastify({ logger: options.logger ?? true });

  app.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(',').map((value) => value.trim()) ?? true
  });

  app.get('/health', async () => ({
    status: 'ok',
    service: 'seedtrace-pf-backend',
    version: '0.1.0-alpha'
  }));

  app.register(cropRoutes, { prefix: '/api/crops' });
  app.register(cultivarRoutes, { prefix: '/api/cultivars' });
  app.register(descriptorRoutes, { prefix: '/api/descriptors' });
  app.register(varietalValueRoutes, { prefix: '/api/varietal-values' });
  app.register(materialRoutes, { prefix: '/api/materials' });
  app.register(lotRoutes, { prefix: '/api/lots' });

  return app;
}
