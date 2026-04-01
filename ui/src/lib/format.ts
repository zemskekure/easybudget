export function fmtCZK(n: number): string {
  if (Math.abs(n) >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1).replace('.0', '')}M`
  }
  if (Math.abs(n) >= 1_000) {
    return `${Math.round(n / 1_000)}k`
  }
  return `${Math.round(n)}`
}

export function fmtFull(n: number): string {
  return new Intl.NumberFormat('cs-CZ').format(Math.round(n))
}
