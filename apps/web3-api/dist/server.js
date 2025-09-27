import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import rateLimit from '@fastify/rate-limit';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';
import { loadConfig } from './env.js';
import { registerRoutes } from './routes.js';
import { authPlugin } from './plugins/auth.js';
import { toBase32Crockford } from './lib/base32.js';
async function buildServer() {
    const app = Fastify({
        logger: {
            level: 'info',
            transport: process.env.NODE_ENV === 'production'
                ? undefined
                : { target: 'pino-pretty' }
        },
        requestIdHeader: 'x-request-id'
    }).withTypeProvider();
    app.decorate('config', loadConfig());
    // Rate limiting keyed by API key when present
    await app.register(rateLimit, {
        global: false,
        max: app.config.rateLimit.max,
        timeWindow: app.config.rateLimit.timeWindow,
        keyGenerator: (req) => {
            const raw = req.headers['x-api-key'];
            const key = Array.isArray(raw) ? String(raw[0] ?? '') : String(raw ?? '');
            const trimmed = key.trim();
            return trimmed ? `key:${trimmed}` : `ip:${req.ip}`;
        }
    });
    // Swagger + OpenAPI
    await app.register(swagger, {
        openapi: {
            info: { title: 'Web3 API', version: '0.1.0' }
        },
        transform: jsonSchemaTransform
    });
    await app.register(swaggerUI, { routePrefix: '/docs' });
    // Auth plugin guards only /v1/* (skips /health and docs internally)
    await app.register(authPlugin, { apiKeys: app.config.apiKeys });
    await registerRoutes(app);
    // OpenAPI JSON shortcut
    app.get('/openapi.json', async (_req, reply) => {
        reply.send(app.swagger());
    });
    // Ensure no 404s leak under /v1/* — treat unknown routes as unauthorized with lore
    app.setNotFoundHandler(async (req, reply) => {
        if (req.raw.url && req.raw.url.startsWith('/v1/')) {
            if (req.apiKeyValid) {
                return reply.code(404).send({ error: 'Not Found' });
            }
            // jitter 150–400ms for unauthorized probes
            await new Promise((r) => setTimeout(r, 150 + Math.random() * 250));
            const lore = 'fatal: route not found; hint: we only speak ApiKey here.';
            return reply
                .header('www-authenticate', 'ApiKey realm="web3-api"')
                .code(401)
                .send({
                error: 'Unauthorized',
                lore: toBase32Crockford(lore),
                loreEnc: 'base32'
            });
        }
        // Default: regular 404 for non‑API paths
        reply.code(404).send({ error: 'Not Found' });
    });
    return app;
}
const app = await buildServer();
app.listen({ host: '0.0.0.0', port: app.config.port }).catch((err) => {
    app.log.error(err);
    process.exit(1);
});
//# sourceMappingURL=server.js.map