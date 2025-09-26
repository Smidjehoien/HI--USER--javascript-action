# Web3 API Service (Fastify + TypeScript + viem)

HTTP JSON API for common EVM reads on Base (default) with OpenAPI docs, simple
key auth, and pragmatic "sentinel" guards.

## Endpoints

- `GET /health` → `{ status, chain, block, rpcLatencyMs, blockTimeSkewMs }`
- `GET /v1/addresses/:address/balance?chain=base` →
  `{ address, wei, ether, blockNumber }`
- `GET /v1/tokens/:contract/:holder/balance?chain=base` →
  `{ contract, holder, decimals, raw, formatted }`
- `GET /v1/txs/:hash?chain=base&confirmations=1` →
  `{ hash, blockNumber, status, from, to, value, confirmations, finality }`

OpenAPI JSON: `/openapi.json` • Docs UI: `/docs`

## Quick start

```bash
# In this directory
npm ci
npm run dev

# Prod build
npm run build && npm start
```

Environment

```bash
ALCHEMY_API_KEY=...      # required (Base + Base Sepolia)
API_KEYS=dev-secret      # comma-separated API keys for X-API-Key; required for /v1/*
PORT=3000                # optional (default 3000)
CHAIN_DEFAULT=base       # base | baseSepolia
RATE_LIMIT_MAX=60        # requests per time window
RATE_LIMIT_WINDOW=60000  # ms per window
CONFIRMATIONS=1          # default confirmations for txs endpoint
```

## Docker

```bash
docker build -t web3-api .
docker run --rm -p 3000:3000 \
  -e ALCHEMY_API_KEY=... \
  -e API_KEYS=dev-secret \
  web3-api
```

## Notes

- Defaults to Base mainnet (chainId 8453). For dev, `chain=baseSepolia`.
- Minimal ERC‑20 ABI is embedded; extend as needed.
- Sentinels: basic uptime (health), finality (confirmations), rate (429 +
  Retry-After), anomaly logging (request id), chain-lag (block time skew).
