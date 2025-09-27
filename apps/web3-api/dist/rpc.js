import { createPublicClient, http } from 'viem';
import { base, baseSepolia } from 'viem/chains';
const chainMap = {
    base,
    baseSepolia
};
const alchemySlug = {
    base: 'base',
    baseSepolia: 'base-sepolia'
};
export function getRpcUrl(chain, alchemyApiKey) {
    const slug = alchemySlug[chain];
    return `https://${slug}.g.alchemy.com/v2/${alchemyApiKey}`;
}
export function makePublicClient(chain, alchemyApiKey) {
    return createPublicClient({
        chain: chainMap[chain],
        transport: http(getRpcUrl(chain, alchemyApiKey))
    });
}
//# sourceMappingURL=rpc.js.map