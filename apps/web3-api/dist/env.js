function getEnv(name) {
    return process.env[name];
}
function requireEnv(name) {
    const v = getEnv(name);
    if (!v)
        throw new Error(`Missing required env ${name}`);
    return v;
}
export function loadConfig() {
    const port = Number(getEnv('PORT') ?? '3000');
    const chainDefault = (getEnv('CHAIN_DEFAULT') ?? 'base');
    const alchemyApiKey = requireEnv('ALCHEMY_API_KEY');
    const apiKeysRaw = getEnv('API_KEYS') ?? '';
    const apiKeys = apiKeysRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    const rateLimit = {
        max: Number(getEnv('RATE_LIMIT_MAX') ?? '60'),
        timeWindow: Number(getEnv('RATE_LIMIT_WINDOW') ?? '60000')
    };
    const confirmationsDefault = Math.max(0, Number(getEnv('CONFIRMATIONS') ?? '1'));
    return { port, chainDefault, alchemyApiKey, apiKeys, rateLimit, confirmationsDefault };
}
//# sourceMappingURL=env.js.map