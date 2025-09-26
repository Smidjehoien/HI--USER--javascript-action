import { createPublicClient, http } from 'viem'
import { base, baseSepolia } from 'viem/chains'

export type ChainKey = 'base' | 'baseSepolia'

const chainMap = {
  base,
  baseSepolia
} as const

const alchemySlug: Record<ChainKey, string> = {
  base: 'base',
  baseSepolia: 'base-sepolia'
}

export function getRpcUrl(chain: ChainKey, alchemyApiKey: string): string {
  const slug = alchemySlug[chain]
  return `https://${slug}.g.alchemy.com/v2/${alchemyApiKey}`
}

export function makePublicClient(chain: ChainKey, alchemyApiKey: string) {
  return createPublicClient({
    chain: chainMap[chain],
    transport: http(getRpcUrl(chain, alchemyApiKey))
  })
}
