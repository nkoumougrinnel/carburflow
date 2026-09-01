/**
 * Fenêtre de courbe : max 4 semaines, labels courts, défilement molette.
 */

export const MAX_CHART_WEEKS = 4

/** Libellé filtre / période : dd/mm/YYYY (déjà fourni par l’API). */
/** Libellé axe courbe : sans année (11/07). */
export function shortChartLabel(label) {
  const text = String(label || '')
  const match = text.match(/(\d{2}\/\d{2})(?:\/\d{2,4})?/)
  return match ? match[1] : text
}

export function toChartLabels(labels = []) {
  return (labels || []).map(shortChartLabel)
}

/** Rayon des points. */
export function seriesPointRadius(labelCount, base = 4, dense = 2) {
  const count = Math.max(0, Number(labelCount) || 0)
  return count > 4 ? dense : base
}

/** Indices visibles (max 4) dans [startIndex, endIndex], avec pan. */
export function visibleChartRange(startIndex, endIndex, panOffset = 0, maxWeeks = MAX_CHART_WEEKS) {
  const start = Math.min(startIndex, endIndex)
  const end = Math.max(startIndex, endIndex)
  const periodLen = Math.max(0, end - start + 1)
  const windowLen = Math.min(maxWeeks, periodLen || 0)
  const maxPan = Math.max(0, periodLen - windowLen)
  const pan = Math.min(maxPan, Math.max(0, Number(panOffset) || 0))
  const viewStart = start + pan
  const viewEnd = viewStart + windowLen - 1
  return {
    viewStart,
    viewEnd,
    pan,
    maxPan,
    periodLen,
    canScroll: maxPan > 0,
  }
}

/** Index de début par défaut = 4 dernières semaines. */
export function defaultPeriodIndices(length, maxWeeks = MAX_CHART_WEEKS) {
  const last = Math.max(0, (length || 0) - 1)
  const first = Math.max(0, last - (maxWeeks - 1))
  return { first, last }
}
