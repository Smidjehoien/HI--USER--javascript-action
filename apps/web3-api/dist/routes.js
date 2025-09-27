import { z } from 'zod';
import { formatEther, formatUnits } from 'viem';
import { ERC20_ABI } from './abi.js';
import { makePublicClient } from './rpc.js';
const addressRegex = /^0x[a-fA-F0-9]{40}$/;
const hashRegex = /^0x([A-Fa-f0-9]{64})$/;
const ChainQuery = z.object({
    chain: z.enum(['base', 'baseSepolia']).default('base')
});
export async function registerRoutes(app) {
    // Health: public, includes chain lag sentinel (block time skew)
    app.get('/health', {
        schema: {
            response: {
                200: z.object({
                    status: z.literal('ok'),
                    chain: z.string(),
                    block: z.string(),
                    rpcLatencyMs: z.number(),
                    blockTimeSkewMs: z.number()
                })
            },
            tags: ['system']
        }
    }, async (_req, reply) => {
        const client = makePublicClient(app.config.chainDefault, app.config.alchemyApiKey);
        const start = Date.now();
        const [blockNumber, block] = await Promise.all([
            client.getBlockNumber(),
            client.getBlock({ blockTag: 'latest' })
        ]);
        const rpcLatencyMs = Date.now() - start;
        const blockTimeSkewMs = Math.abs(Date.now() - Number(block.timestamp) * 1000);
        reply.send({
            status: 'ok',
            chain: app.config.chainDefault,
            block: blockNumber.toString(),
            rpcLatencyMs,
            blockTimeSkewMs
        });
    });
    // Balance endpoint
    app.get('/v1/addresses/:address/balance', {
        schema: {
            params: z.object({ address: z.string().regex(addressRegex) }),
            querystring: ChainQuery,
            response: {
                200: z.object({
                    address: z.string(),
                    wei: z.string(),
                    ether: z.string(),
                    blockNumber: z.string()
                })
            },
            tags: ['read']
        },
        config: {
            rateLimit: {
                max: app.config.rateLimit.max,
                timeWindow: app.config.rateLimit.timeWindow
            }
        }
    }, async (req, reply) => {
        const { address } = req.params;
        const { chain } = req.query;
        const client = makePublicClient(chain, app.config.alchemyApiKey);
        const [wei, blockNumber] = await Promise.all([
            client.getBalance({ address: address }),
            client.getBlockNumber()
        ]);
        const ether = formatEther(wei);
        reply.send({
            address,
            wei: wei.toString(),
            ether,
            blockNumber: blockNumber.toString()
        });
    });
    // ERC-20 token balance
    app.get('/v1/tokens/:contract/:holder/balance', {
        schema: {
            params: z.object({
                contract: z.string().regex(addressRegex),
                holder: z.string().regex(addressRegex)
            }),
            querystring: ChainQuery,
            response: {
                200: z.object({
                    contract: z.string(),
                    holder: z.string(),
                    decimals: z.number(),
                    raw: z.string(),
                    formatted: z.string()
                })
            },
            tags: ['read']
        },
        config: {
            rateLimit: {
                max: app.config.rateLimit.max,
                timeWindow: app.config.rateLimit.timeWindow
            }
        }
    }, async (req, reply) => {
        const { contract, holder } = req.params;
        const { chain } = req.query;
        const client = makePublicClient(chain, app.config.alchemyApiKey);
        const [decimals, raw] = await Promise.all([
            client.readContract({
                address: contract,
                abi: ERC20_ABI,
                functionName: 'decimals'
            }),
            client.readContract({
                address: contract,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [holder]
            })
        ]);
        const formatted = BigInt(raw) === 0n
            ? '0'
            : formatUnits(raw, Number(decimals));
        reply.send({
            contract,
            holder,
            decimals: Number(decimals),
            raw: raw.toString(),
            formatted
        });
    });
    // Transaction status
    app.get('/v1/txs/:hash', {
        schema: {
            params: z.object({ hash: z.string().regex(hashRegex) }),
            querystring: ChainQuery.extend({
                confirmations: z.coerce
                    .number()
                    .int()
                    .min(0)
                    .default(app.config.confirmationsDefault)
            }),
            response: {
                200: z.union([
                    z.object({
                        found: z.literal(true),
                        hash: z.string(),
                        blockNumber: z.string().nullable(),
                        status: z.enum(['pending', 'success', 'reverted']),
                        from: z.string().nullable(),
                        to: z.string().nullable(),
                        value: z.string().nullable(),
                        confirmations: z.number(),
                        finality: z.enum(['pending', 'safe'])
                    }),
                    z.object({ found: z.literal(false) })
                ])
            },
            tags: ['read']
        },
        config: {
            rateLimit: {
                max: app.config.rateLimit.max,
                timeWindow: app.config.rateLimit.timeWindow
            }
        }
    }, async (req, reply) => {
        const { hash } = req.params;
        const { chain, confirmations } = req.query;
        const client = makePublicClient(chain, app.config.alchemyApiKey);
        const [tx, receipt, head] = await Promise.all([
            client.getTransaction({ hash }).catch(() => null),
            client.getTransactionReceipt({ hash }).catch(() => null),
            client.getBlockNumber()
        ]);
        if (!tx && !receipt) {
            reply.code(200).send({ found: false });
            return;
        }
        const blockNumber = receipt?.blockNumber ?? tx?.blockNumber ?? null;
        const status = receipt?.status ?? 'pending';
        const conf = blockNumber ? Number(head - blockNumber) : 0;
        const finality = conf >= confirmations ? 'safe' : 'pending';
        reply.send({
            found: true,
            hash,
            blockNumber: blockNumber ? blockNumber.toString() : null,
            status: status,
            from: tx?.from ?? null,
            to: tx?.to ?? null,
            value: tx?.value ? tx.value.toString() : null,
            confirmations: conf,
            finality
        });
    });
}
//# sourceMappingURL=routes.js.map