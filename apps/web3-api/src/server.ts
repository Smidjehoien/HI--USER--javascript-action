import Fastify from 'fastify'
import swagger from '@fastify/swagger'
import swaggerUI from '@fastify/swagger-ui'
import rateLimit from '@fastify/rate-limit'
import { ZodTypeProvider, jsonSchemaTransform } from 'fastify-type-provider-zod'
import { loadConfig } from './env.js'
import { registerRoutes } from './routes.js'
import { authPlugin } from './plugins/auth.js'

declare module 'fastify' {
  interface FastifyInstance {
    config: ReturnType<typeof loadConfig>
  }
}

async function buildServer() {
  const app = Fastify({
    logger: {
      level: 'info',
      transport:
        process.env.NODE_ENV === 'production'
          ? undefined
          : { target: 'pino-pretty' }
    },
    requestIdHeader: 'x-request-id'
  }).withTypeProvider<ZodTypeProvider>()

  app.decorate('config', loadConfig())

  // Rate limiting keyed by API key when present
  await app.register(rateLimit, {
    global: false,
    max: app.config.rateLimit.max,
    timeWindow: app.config.rateLimit.timeWindow,
    keyGenerator: (req) => {
      const raw = req.headers['x-api-key'] as string | string[] | undefined
      const key = Array.isArray(raw) ? String(raw[0] ?? '') : String(raw ?? '')
      const trimmed = key.trim()
      return trimmed ? `key:${trimmed}` : `ip:${req.ip}`
    }
  })

  // Swagger + OpenAPI
  await app.register(swagger, {
    openapi: {
      info: { title: 'Web3 API', version: '0.1.0' }
    },
    transform: jsonSchemaTransform
  })
  await app.register(swaggerUI, { routePrefix: '/docs' })

  // Auth only for /v1 paths (register in a prefixed scope)
  await app.register(
    async (instance) => {
      await instance.register(authPlugin, { apiKeys: instance.config.apiKeys })
    },
    { prefix: '/v1' }
  )

  await registerRoutes(app)

  // OpenAPI JSON shortcut
  app.get('/openapi.json', async (_req, reply) => {
    reply.send(app.swagger())
  })

  return app
}

const app = await buildServer()
app.listen({ host: '0.0.0.0', port: app.config.port }).catch((err) => {
  app.log.error(err)
  process.exit(1)
})
