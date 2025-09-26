export type AppConfig = {
  port: number
  chainDefault: 'base' | 'baseSepolia'
  alchemyApiKey: string
  apiKeys: string[]
  rateLimit: { max: number; timeWindow: number }
  confirmationsDefault: number
}

function getEnv(name: string): string | undefined {
  return process.env[name]
}

function requireEnv(name: string): string {
  const v = getEnv(name)
  if (!v) throw new Error(`Missing required env ${name}`)
  return v
}

export function loadConfig(): AppConfig {
  const port = Number(getEnv('PORT') ?? '3000')
  const chainDefault = (getEnv('CHAIN_DEFAULT') ?? 'base') as
    | 'base'
    | 'baseSepolia'
  const alchemyApiKey = requireEnv('ALCHEMY_API_KEY')
  const apiKeysRaw = getEnv('API_KEYS') ?? ''
  const apiKeys = apiKeysRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const rateLimit = {
    max: Number(getEnv('RATE_LIMIT_MAX') ?? '60'),
    timeWindow: Number(getEnv('RATE_LIMIT_WINDOW') ?? '60000')
  }

  const confirmationsDefault = Math.max(
    0,
    Number(getEnv('CONFIRMATIONS') ?? '1')
  )

  return {
    port,
    chainDefault,
    alchemyApiKey,
    apiKeys,
    rateLimit,
    confirmationsDefault
  }
}
