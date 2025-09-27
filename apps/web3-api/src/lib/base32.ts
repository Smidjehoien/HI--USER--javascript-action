// Crockford Base32 (uppercase, no padding) encoder for short, non‑secret strings.
// Ref: https://www.crockford.com/base32.html
export const B32_CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

export function toBase32Crockford(input: string): string {
  const bytes = new TextEncoder().encode(input)
  let bits = 0
  let value = 0
  let out = ''
  for (const b of bytes) {
    value = (value << 8) | b
    bits += 8
    while (bits >= 5) {
      out += B32_CROCKFORD[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) {
    out += B32_CROCKFORD[(value << (5 - bits)) & 31]
  }
  return out
}
