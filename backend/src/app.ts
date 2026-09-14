import Fastify from 'fastify';
import { cropRoutes } from './routes/crops.js';
import { cultivarRoutes } from './routes/cultivars.js';
import { descriptorRoutes } from './routes/descriptors.js';
import { materialRoutes } from './routes/materials.js';
import { lotRoutes } from './routes/lots.js';

export function buildApp(options: { logger?: boolean } = {}) {
  const app = Fastify({ logger: options.logger ?? true });

  app.get('/health', async () => ({
    status: 'ok',
    service: 'seedtrace-pf-backend',
    version: '0.1.0-alpha'
  }));

  app.register(cropRoutes, { prefix: '/api/crops' });
  app.register(cultivarRoutes, { prefix: '/api/cultivars' });
  app.register(descriptorRoutes, { prefix: '/api/descriptors' });
  app.register(materialRoutes, { prefix: '/api/materials' });
  app.register(lotRoutes, { prefix: '/api/lots' });

  return app;
}
