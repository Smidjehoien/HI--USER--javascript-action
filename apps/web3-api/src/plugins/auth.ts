import type { FastifyPluginCallback } from 'fastify'

export type AuthOptions = {
  apiKeys: string[]
}

export const authPlugin: FastifyPluginCallback<AuthOptions> = (
  app,
  opts,
  done
) => {
  const allowed = new Set(
    (opts.apiKeys ?? []).map((s) => s.trim()).filter(Boolean)
  )

  app.addHook('onRequest', async (req, reply) => {
    const provided = (req.headers['x-api-key'] ||
      req.headers['X-API-Key'] ||
      '') as string
    if (!allowed.size) {
      reply.code(500).send({ error: 'Server not configured with API_KEYS' })
      return
    }
    if (!provided || !allowed.has(provided)) {
      reply
        .header('www-authenticate', 'ApiKey')
        .code(401)
        .send({ error: 'Unauthorized' })
      return
    }
  })

  done()
}
