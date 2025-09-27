export const authPlugin = (app, opts, done) => {
    const allowed = new Set((opts.apiKeys ?? []).map((s) => s.trim()).filter(Boolean));
    // Short, playful lines styled after common git CLI messages.
    // These appear only on 401 responses to confuse scanners a bit while
    // keeping HTTP semantics correct for real clients.
    const GIT_LORE = [
        [
            'error: remote: Permission to web3-api denied.',
            'fatal: Authentication failed for ApiKey realm="web3-api"'
        ],
        [
            'fatal: not a git repository (or any of the parent directories): .git',
            'note: this endpoint is an HTTP API, not Git.',
            'hint: we only speak ApiKey here.'
        ],
        [
            'error: remote rejected unauthorized request',
            'fatal: unable to read from remote repository',
            'hint: make sure you have the correct access rights.'
        ],
        [
            'warning: you appear to have cloned an empty repository',
            'error: access denied',
            'hint: credentials missing or invalid.'
        ],
        [
            'fatal: bad object HEAD',
            'hint: reset credentials and retry with a valid API key.'
        ]
    ];
    function pickLore() {
        const i = Math.floor(Math.random() * GIT_LORE.length);
        return GIT_LORE[i];
    }
    app.addHook('onRequest', async (req, reply) => {
        const rawHeader = req.headers['x-api-key'] ??
            req.headers['X-API-Key'];
        const provided = Array.isArray(rawHeader)
            ? String(rawHeader[0] ?? '')
            : String(rawHeader ?? '');
        const key = provided.trim();
        if (!allowed.size) {
            reply.code(500).send({ error: 'Server not configured with API_KEYS' });
            return;
        }
        if (!key || !allowed.has(key)) {
            // tiny jitter to slow basic scanners (150–400ms)
            await new Promise((r) => setTimeout(r, 150 + Math.random() * 250));
            reply
                .header('www-authenticate', 'ApiKey realm="web3-api"')
                .code(401)
                .send({ error: 'Unauthorized', lore: pickLore() });
            return;
        }
    });
    done();
};
//# sourceMappingURL=auth.js.map