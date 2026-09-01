/**
 * Semantique unique des écarts (conso / L/h / stock consommé) :
 * hausse = mauvais (rouge), baisse = bon (vert).
 * Autonomie (heures restantes) et stock restant : passer { invert: true }.
 */

export function formatEcartPct(pct) {
  if (pct == null || Number.isNaN(Number(pct))) return null
  const value = Number(pct)
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)} %`
}

export function ecartTitle(pct) {
  const formatted = formatEcartPct(pct)
  if (!formatted) return 'Pas de comparaison vs sem. précédente'
  return `${formatted} vs sem. précédente`
}

export function ecartClass(pct, { invert = false } = {}) {
  if (pct == null || Number.isNaN(Number(pct)) || Number(pct) === 0) return ''
  const increase = Number(pct) > 0
  const unfavorable = invert ? !increase : increase
  return unfavorable ? 'negative' : 'positive'
}

export function deltaClass(pct, { invert = false } = {}) {
  if (pct == null || Number.isNaN(Number(pct)) || Number(pct) === 0) return 'delta-neutral'
  const increase = Number(pct) > 0
  const unfavorable = invert ? !increase : increase
  return unfavorable ? 'delta-down' : 'delta-up'
}

export function ecartArrow(pct) {
  if (pct == null || Number.isNaN(Number(pct)) || Number(pct) === 0) return ''
  return Number(pct) > 0 ? '▲' : '▼'
}
