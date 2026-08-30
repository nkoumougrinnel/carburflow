import { formatAutonomy } from './format.js'

/** Libellés / rangs des 4 priorités métier (alignés backend). */
export const PRIORITE_META = {
  critique: { label: 'Critique', level: 'critical', rank: 4, key: 'critique' },
  haute: { label: 'Haute', level: 'high', rank: 3, key: 'haute' },
  moyenne: { label: 'Moyenne', level: 'medium', rank: 2, key: 'moyenne' },
  basse: { label: 'Basse', level: 'low', rank: 1, key: 'basse' },
}

/** @deprecated alias — préférer PRIORITE_META */
export const SEVERITY_META = {
  critical: PRIORITE_META.critique,
  high: PRIORITE_META.haute,
  medium: PRIORITE_META.moyenne,
  low: PRIORITE_META.basse,
}

export const ALERT_TYPE_META = {
  autonomie_critique: { label: 'Autonomie critique' },
  autonomie_preventive: { label: 'Autonomie préventive' },
  conso_sans_horaire: { label: 'Conso. sans horaire' },
  horaire_sans_conso: { label: 'Horaire sans conso.' },
  ecart_conso: { label: 'Écart consommation' },
}

const PRIORITE_ALIASES = {
  critique: 'critique',
  critical: 'critique',
  urgent: 'critique',
  haute: 'haute',
  high: 'haute',
  moyenne: 'moyenne',
  medium: 'moyenne',
  warning: 'moyenne',
  basse: 'basse',
  low: 'basse',
  attention: 'basse',
}

export function resolvePrioriteKey(alert) {
  const raw = String(
    alert?.priorite || alert?.priority_level || alert?.severity || '',
  ).toLowerCase()
  if (PRIORITE_ALIASES[raw]) return PRIORITE_ALIASES[raw]

  const label = String(alert?.priority || '').toLowerCase()
  if (label.includes('critique')) return 'critique'
  if (label.includes('haute') || label.includes('urgent')) return 'haute'
  if (label.includes('moyenne') || label.includes('moyen') || label.includes('surveiller')) {
    return 'moyenne'
  }
  if (label.includes('basse') || label.includes('attention') || label.includes('faible')) {
    return 'basse'
  }
  return 'moyenne'
}

export function normalizeAlertSeverity(alert) {
  const key = resolvePrioriteKey(alert)
  return PRIORITE_META[key] || PRIORITE_META.moyenne
}

/** Normalise une alerte API BD vers le format UI. */
export function normalizePersistedAlert(alert) {
  if (!alert) return null
  const prioriteKey = resolvePrioriteKey(alert)
  const meta = PRIORITE_META[prioriteKey] || PRIORITE_META.moyenne
  const priorityLabel = (
    alert.priority
    || PRIORITE_META[alert.priorite]?.label
    || meta.label
  )
  const ctx = alert.donnees_contexte || alert.context || {}
  return {
    ...alert,
    id: alert.id || alert.cle || `alerte-${alert.db_id}`,
    type: alert.type || alert.type_alerte,
    priorite: alert.priorite || prioriteKey,
    priority: priorityLabel,
    priority_level: meta.level,
    severity: meta.level,
    title: alert.title || alert.message || 'Alerte',
    subtitle: alert.subtitle || '',
    traitee: alert.traitee === true || alert.etat === 'traitee',
    detected_at: alert.detected_at || alert.date_apparition || null,
    target: alert.target || (alert.group_id ? 'groups' : 'site'),
    is_infinite_consumption: !!(alert.is_infinite_consumption || ctx.is_infinite_consumption),
    donnees_contexte: ctx,
  }
}

/**
 * Autonomie indéterminée (conso sans delta) : pas une alerte d’urgence.
 * Filtre les anciennes alertes « 0 h urgent » encore en BD.
 */
export function isIndeterminateAutonomyAlert(alert) {
  if (!alert) return false
  const type = alert.type || alert.type_alerte
  if (type === 'autonomie_indeterminee') return true
  if (alert.is_infinite_consumption) return true
  const ctx = alert.donnees_contexte || alert.context || {}
  if (ctx.is_infinite_consumption) return true
  const msg = `${alert.title || ''} ${alert.message || ''} ${alert.subtitle || ''}`.toLowerCase()
  if (msg.includes('autonomie indéterminée')) return true
  if (msg.includes('consommation sans delta')) return true
  return false
}

function isConsSansDelta(g) {
  if (!(g.latest_consumption > 0)) return false
  if (g.latest_hours == null) return true
  if (g.latest_hours > 0) return false
  if (g.latest_hourly_consumption != null && g.latest_hourly_consumption > 0) return false
  return true
}

function isEcartConso(g) {
  const mean = g.mean_hourly_consumption_deduite
  const latest = g.latest_hourly_consumption
  const previous = g.previous_hourly_consumption
  if (!(mean > 0) || latest == null || latest <= 0) return false
  if (previous == null || previous <= 0) return false
  return Math.abs((latest - mean) / mean) * 100 > 15
}

/**
 * Construit la liste d’alertes à partir des lignes sites/groupes du dashboard.
 * Ajoute detected_at (ISO) pour le filtre par date côté UI.
 */
export function buildDashboardAlerts(siteRows = [], groupRows = [], detectedAt = new Date()) {
  const stamp = detectedAt instanceof Date ? detectedAt.toISOString() : String(detectedAt)

  const autonomyAlerts = siteRows.flatMap((site) => {
    // Indéterminée / sans fonctionnement : pas d’alerte d’autonomie
    if (site.is_infinite_consumption) return []
    if (site.is_infinite_autonomy || site.is_sans_fonctionnement) return []

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
      const signedEcart = ((g.latest_hourly_consumption - g.previous_hourly_consumption) / g.previous_hourly_consumption) * 100
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
        title: `Groupe ${g.label} — écart consommation horaire ${sign}${absEcart}% (semaine N vs N-1)`,
        subtitle: `Consommation horaire semaine N : ${g.latest_hourly_consumption.toFixed(2)} L/h — Semaine N-1 : ${g.previous_hourly_consumption.toFixed(2)} L/h — Écart : ${sign}${absEcart}%.`,
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
    const bySeverity = (normalizeAlertSeverity(b).rank || 0) - (normalizeAlertSeverity(a).rank || 0)
    if (bySeverity !== 0) return bySeverity
    return (b.ecart_pct || 0) - (a.ecart_pct || 0)
  })
}

export function countAlertsBySeverity(alerts = []) {
  return {
    critique: alerts.filter((a) => resolvePrioriteKey(a) === 'critique').length,
    haute: alerts.filter((a) => resolvePrioriteKey(a) === 'haute').length,
    moyenne: alerts.filter((a) => resolvePrioriteKey(a) === 'moyenne').length,
    basse: alerts.filter((a) => resolvePrioriteKey(a) === 'basse').length,
    // alias UI (compat)
    critical: alerts.filter((a) => resolvePrioriteKey(a) === 'critique').length,
    high: alerts.filter((a) => resolvePrioriteKey(a) === 'haute').length,
    medium: alerts.filter((a) => resolvePrioriteKey(a) === 'moyenne').length,
    low: alerts.filter((a) => resolvePrioriteKey(a) === 'basse').length,
    total: alerts.length,
  }
}

/** Aperçu dashboard : priorité critique d’abord, max 3. */
export function pickPreviewAlerts(alerts = [], { maxTotal = 3 } = {}) {
  const rank = { critique: 0, haute: 1, moyenne: 2, basse: 3 }
  return [...alerts]
    .sort((a, b) => {
      const ra = rank[resolvePrioriteKey(a)] ?? 9
      const rb = rank[resolvePrioriteKey(b)] ?? 9
      if (ra !== rb) return ra - rb
      const ta = new Date(a.detected_at || 0).getTime()
      const tb = new Date(b.detected_at || 0).getTime()
      return tb - ta
    })
    .slice(0, maxTotal)
}

export function filterAlerts(
  alerts = [],
  { priority = 'all', type = 'all', dateRange = 'all', status = 'active' } = {},
) {
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  const priorityKey = priority === 'all' ? null : (PRIORITE_ALIASES[priority] || priority)

  return alerts.filter((a) => {
    if (status === 'active' && (a.traitee || a.etat === 'ignoree')) return false
    if (status === 'treated' && !a.traitee) return false
    if (status === 'history' && !(a.traitee || a.etat === 'ignoree' || a.etat === 'traitee')) return false
    if (priorityKey && resolvePrioriteKey(a) !== priorityKey) return false
    if (type !== 'all' && a.type !== type) return false
    if (dateRange !== 'all') {
      const dateSource = status === 'history'
        ? (a.date_traitement || a.detected_at)
        : a.detected_at
      const ts = dateSource ? new Date(dateSource).getTime() : now
      if (dateRange === 'today' && now - ts > dayMs) return false
      if (dateRange === 'week' && now - ts > 7 * dayMs) return false
      if (dateRange === 'month' && now - ts > 30 * dayMs) return false
    }
    return true
  })
}

/** Enrichit les alertes calculées avec les traitements persistés. */
export function mergeAlertTreatments(alerts = [], treatments = []) {
  const byCle = new Map(
    (treatments || [])
      .filter((t) => t && t.cle)
      .map((t) => [t.cle, t]),
  )
  return alerts.map((alert) => {
    const treatment = byCle.get(alert.id)
    if (!treatment) return { ...alert, traitee: false }
    return {
      ...alert,
      traitee: true,
      justification: treatment.justification || '',
      traite_par: treatment.traite_par_username || null,
      date_traitement: treatment.date_traitement || null,
    }
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
