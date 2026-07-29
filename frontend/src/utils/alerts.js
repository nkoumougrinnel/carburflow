import { formatAutonomy } from './format.js'

export const SEVERITY_META = {
  critical: { label: 'Urgent', level: 'critical', rank: 3 },
  medium: { label: 'À surveiller', level: 'medium', rank: 2 },
  low: { label: 'Attention', level: 'low', rank: 1 },
}

export const ALERT_TYPE_META = {
  critique: { label: 'Autonomie critique' },
  alerte: { label: 'Autonomie faible' },
  anomalie: { label: 'Anomalie saisie' },
  ecart: { label: 'Écart conso' },
}

export function normalizeAlertSeverity(alert) {
  const raw = String(alert.priority_level || alert.severity || '').toLowerCase()
  const label = String(alert.priority || '').toLowerCase()
  if (raw === 'urgent' || raw === 'critical' || label.includes('critique')) {
    return SEVERITY_META.critical
  }
  if (raw === 'high' || raw === 'medium' || label.includes('moyen')) {
    return SEVERITY_META.medium
  }
  if (
    raw === 'warning'
    || raw === 'low'
    || raw === 'attention'
    || label.includes('faible')
    || label.includes('attention')
  ) {
    return SEVERITY_META.low
  }
  return SEVERITY_META.medium
}

function isConsSansDelta(g) {
  return (g.latest_consumption > 0) && !(g.latest_hours > 0)
}

function isEcartConso(g) {
  const mean = g.mean_hourly_consumption_deduite
  const latest = g.latest_hourly_consumption
  if (!(mean > 0) || latest == null) return false
  return Math.abs((latest - mean) / mean) * 100 > 15
}

/**
 * Construit la liste d’alertes à partir des lignes sites/groupes du dashboard.
 * Ajoute detected_at (ISO) pour le filtre par date côté UI.
 */
export function buildDashboardAlerts(siteRows = [], groupRows = [], detectedAt = new Date()) {
  const stamp = detectedAt instanceof Date ? detectedAt.toISOString() : String(detectedAt)

  const autonomyAlerts = siteRows.flatMap((site) => {
    if (site.is_infinite_autonomy) return []

    if (site.is_infinite_consumption) {
      return [{
        id: `site-critique-0h-${site.id}`,
        type: 'critique',
        target: 'site',
        priority: 'Critique',
        priority_level: 'critical',
        severity: 'critical',
        site_id: site.id,
        site_name: site.site_name,
        title: `Site ${site.site_name} — autonomie critique : 0 h`,
        subtitle: `Consommation de carburant détectée (moy. ${site.avg_consumption.toFixed(1)} L) mais aucun delta horaire enregistré — temps restant indéterminé.`,
        is_infinite_consumption: true,
        detected_at: stamp,
      }]
    }

    if (site.autonomie_hours == null) return []

    if (site.autonomie_hours < 48) {
      return [{
        id: `site-critique-${site.id}`,
        type: 'critique',
        target: 'site',
        priority: 'Critique',
        priority_level: 'critical',
        severity: 'critical',
        site_id: site.id,
        site_name: site.site_name,
        title: `Site ${site.site_name} — autonomie critique : ${site.formatted_autonomy || formatAutonomy(site.autonomie_hours)}`,
        subtitle: `Moins de 48 h de carburant restant (${site.formatted_autonomy || formatAutonomy(site.autonomie_hours)}). Stock actuel : ${site.latest_volume.toFixed(0)} L. Réapprovisionner de toute urgence.`,
        is_infinite_consumption: false,
        detected_at: stamp,
      }]
    }

    if (site.autonomie_hours < 120) {
      return [{
        id: `site-faible-${site.id}`,
        type: 'alerte',
        target: 'site',
        priority: 'À surveiller',
        priority_level: 'medium',
        severity: 'medium',
        site_id: site.id,
        site_name: site.site_name,
        title: `Site ${site.site_name} — autonomie sous surveillance : ${site.formatted_autonomy || formatAutonomy(site.autonomie_hours)}`,
        subtitle: `Autonomie sous 5 jours (${site.formatted_autonomy || formatAutonomy(site.autonomie_hours)}). Stock actuel : ${site.latest_volume.toFixed(0)} L. Planifier un réapprovisionnement.`,
        is_infinite_consumption: false,
        detected_at: stamp,
      }]
    }

    return []
  })

  const groupWithHoursNoConsumption = groupRows
    .filter((g) => g.latest_hours > 0 && !(g.latest_consumption > 0))
    .map((g) => ({
      id: `group-hours-no-cons-${g.id}`,
      type: 'anomalie',
      target: 'groups',
      priority: 'Attention',
      priority_level: 'low',
      severity: 'low',
      group_id: g.id,
      group_label: g.label,
      site_name: g.site_name,
      title: `Groupe ${g.label} — delta horaire sans consommation (semaine N)`,
      subtitle: `Delta horaire semaine N : ${g.latest_hours.toFixed(1)} h — aucune consommation de carburant enregistrée (0 L). Vérifier la jauge et la saisie des consommations.`,
      is_infinite_consumption: false,
      ecart_pct: 0,
      detected_at: stamp,
    }))

  const groupWithConsNoHours = groupRows
    .filter((g) => isConsSansDelta(g))
    .map((g) => ({
      id: `group-cons-no-hours-${g.id}`,
      type: 'anomalie',
      target: 'groups',
      priority: 'Urgent',
      priority_level: 'critical',
      severity: 'critical',
      group_id: g.id,
      group_label: g.label,
      site_name: g.site_name,
      title: `Groupe ${g.label} — consommation sans fonctionnement (semaine N)`,
      subtitle: `Consommation enregistrée en semaine N : ${g.latest_consumption.toFixed(1)} L — mais aucun delta horaire (0 h). Le groupe a consommé du carburant sans tourner.`,
      is_infinite_consumption: true,
      ecart_pct: 0,
      detected_at: stamp,
    }))

  const groupWithHighVariance = groupRows
    .filter((g) => isEcartConso(g))
    .map((g) => {
      const signedEcart = ((g.latest_hourly_consumption - g.mean_hourly_consumption_deduite) / g.mean_hourly_consumption_deduite) * 100
      const sign = signedEcart >= 0 ? '▲' : '▼'
      const absEcart = Math.abs(signedEcart).toFixed(1)
      return {
        id: `group-variance-${g.id}`,
        type: 'ecart',
        target: 'groups',
        priority: 'À surveiller',
        priority_level: 'medium',
        severity: 'medium',
        group_id: g.id,
        group_label: g.label,
        site_name: g.site_name,
        title: `Groupe ${g.label} — écart consommation horaire ${sign}${absEcart}% (semaine N)`,
        subtitle: `Consommation horaire semaine N : ${g.latest_hourly_consumption.toFixed(2)} L/h — Moyenne habituelle : ${g.mean_hourly_consumption_deduite.toFixed(2)} L/h — Écart : ${sign}${absEcart}%.`,
        is_infinite_consumption: false,
        ecart_pct: Math.abs(signedEcart),
        detected_at: stamp,
      }
    })
    .sort((a, b) => (b.ecart_pct || 0) - (a.ecart_pct || 0))

  const alertMap = new Map()
  ;[...autonomyAlerts, ...groupWithConsNoHours, ...groupWithHoursNoConsumption, ...groupWithHighVariance]
    .forEach((item) => {
      if (!alertMap.has(item.id)) alertMap.set(item.id, item)
    })

  return Array.from(alertMap.values()).sort((a, b) => {
    const bySeverity = (SEVERITY_META[b.severity]?.rank || 0) - (SEVERITY_META[a.severity]?.rank || 0)
    if (bySeverity !== 0) return bySeverity
    return (b.ecart_pct || 0) - (a.ecart_pct || 0)
  })
}

export function countAlertsBySeverity(alerts = []) {
  return {
    critical: alerts.filter((a) => a.severity === 'critical').length,
    medium: alerts.filter((a) => a.severity === 'medium').length,
    low: alerts.filter((a) => a.severity === 'low').length,
    total: alerts.length,
  }
}

/** Aperçu dashboard : max par priorité, plafonné. */
export function pickPreviewAlerts(alerts = [], { perSeverity = 2, maxTotal = 6 } = {}) {
  const buckets = { critical: [], medium: [], low: [] }
  alerts.forEach((a) => {
    if (buckets[a.severity] && buckets[a.severity].length < perSeverity) {
      buckets[a.severity].push(a)
    }
  })
  return [...buckets.critical, ...buckets.medium, ...buckets.low].slice(0, maxTotal)
}

export function filterAlerts(alerts = [], { priority = 'all', type = 'all', dateRange = 'all' } = {}) {
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000

  return alerts.filter((a) => {
    if (priority !== 'all' && a.severity !== priority) return false
    if (type !== 'all' && a.type !== type) return false
    if (dateRange !== 'all') {
      const ts = a.detected_at ? new Date(a.detected_at).getTime() : now
      if (dateRange === 'today' && now - ts > dayMs) return false
      if (dateRange === 'week' && now - ts > 7 * dayMs) return false
      if (dateRange === 'month' && now - ts > 30 * dayMs) return false
    }
    return true
  })
}

export function splitAlertSubtitle(subtitle) {
  if (!subtitle) return []
  return String(subtitle).split(/(▲[\d.,]+%|▼[\d.,]+%)/).map((part) => {
    const arrowMatch = part.match(/^(▲|▼)([\d.,]+%)$/)
    if (arrowMatch) {
      return { kind: 'arrow', up: arrowMatch[1] === '▲', text: `${arrowMatch[1]}${arrowMatch[2]}%` }
    }
    return { kind: 'text', text: part }
  })
}
