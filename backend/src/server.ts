import Fastify from 'fastify';
import { cropRoutes } from './routes/crops.js';
import { cultivarRoutes } from './routes/cultivars.js';
import { descriptorRoutes } from './routes/descriptors.js';
import { materialRoutes } from './routes/materials.js';
import { lotRoutes } from './routes/lots.js';

const app = Fastify({ logger: true });

app.get('/health', async () => ({
  status: 'ok',
  service: 'seedtrace-pf-backend',
  version: '0.1.0-alpha'
}));

await app.register(cropRoutes, { prefix: '/api/crops' });
await app.register(cultivarRoutes, { prefix: '/api/cultivars' });
await app.register(descriptorRoutes, { prefix: '/api/descriptors' });
await app.register(materialRoutes, { prefix: '/api/materials' });
await app.register(lotRoutes, { prefix: '/api/lots' });

const port = Number(process.env.PORT ?? 3333);
const host = process.env.HOST ?? '0.0.0.0';

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
