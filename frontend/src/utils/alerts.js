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

/**
 * Grille figée des 5 typologies (source unique d'affichage) :
 * mêmes titres dans le détail du groupe, le Dashboard et le Centre d'alertes.
 */
export const ALERT_TYPE_META = {
  autonomie_critique: {
    code: 'autonomie_critique',
    title: 'Autonomie inférieure à 24 h',
    label: 'Autonomie inférieure à 24 h',
    priorite: 'critique',
  },
  autonomie_preventive: {
    code: 'autonomie_preventive',
    title: 'Autonomie inférieure à 36 h',
    label: 'Autonomie inférieure à 36 h',
    priorite: 'moyenne',
  },
  conso_sans_fonctionnement: {
    code: 'conso_sans_fonctionnement',
    title: 'Consommation sans fonctionnement',
    label: 'Consommation sans fonctionnement',
    priorite: 'haute',
  },
  fonctionnement_sans_consommation: {
    code: 'fonctionnement_sans_consommation',
    title: 'Fonctionnement sans consommation',
    label: 'Fonctionnement sans consommation',
    priorite: 'haute',
  },
  ecart_conso: {
    code: 'ecart_conso',
    title: 'Écart de consommation horaire',
    label: 'Écart de consommation horaire',
    priorite: 'moyenne',
  },
  compteur_incoherent: {
    code: 'compteur_incoherent',
    title: 'Compteur horaire incohérent',
    label: 'Compteur horaire incohérent',
    priorite: 'haute',
  },
}

/** Anciens codes (backend / UI) → codes figés. */
const TYPE_CODE_ALIASES = {
  autonomie_critique: 'autonomie_critique',
  autonomie_preventive: 'autonomie_preventive',
  conso_sans_fonctionnement: 'conso_sans_fonctionnement',
  fonctionnement_sans_consommation: 'fonctionnement_sans_consommation',
  ecart_conso: 'ecart_conso',
  compteur_incoherent: 'compteur_incoherent',
  // anciens codes backend
  conso_sans_horaire: 'conso_sans_fonctionnement',
  horaire_sans_conso: 'fonctionnement_sans_consommation',
  // anciens codes UI
  critique: 'autonomie_critique',
  alerte: 'autonomie_preventive',
  anomalie: 'conso_sans_fonctionnement',
  ecart: 'ecart_conso',
}

/** Code figé d'une alerte (null si inconnu). */
export function resolveAlertTypeCode(alert) {
  const raw = String(alert?.type || alert?.type_alerte || alert?.type_code || '').toLowerCase()
  return TYPE_CODE_ALIASES[raw] || null
}

/* — Formateurs fr-FR partagés (grille d'affichage commune) — */
const nf0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const nf1 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const nf2 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function formatLitresFr(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return null
  return `${nf0.format(Math.round(num))} L`
}

export function formatHeuresFr(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return null
  return `${nf1.format(num)} h`
}

/** Heures affichées : 0 → '0 h' (jamais « 0,0 h »), null si indisponible. */
function heuresOuZero(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return null
  return num > 0 ? formatHeuresFr(num) : '0 h'
}

export function formatTauxFr(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return null
  return `${nf2.format(num)} L/h`
}

export function formatPctFr(value, { signed = false } = {}) {
  const num = Number(value)
  if (!Number.isFinite(num)) return null
  const sign = signed ? (num > 0 ? '+' : num < 0 ? '−' : '') : ''
  return `${sign}${nf1.format(Math.abs(num))} %`
}

/** '2026-08-31' / ISO → '31/08/2026'. */
export function formatAlertDateShort(value) {
  if (!value) return ''
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) return `${match[3]}/${match[2]}/${match[1]}`
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('fr-FR')
}

/** ISO datetime → '31/08/2026 09:16' (heure masquée si 00:00). */
export function formatAlertDateTime(value) {
  if (!value) return '—'
  const str = String(value)
  // Chaîne avec fuseau horaire (ex. +00:00 / Z) → conversion en heure locale
  if (/[zZ]$/.test(str) || /[+-]\d{2}:?\d{2}$/.test(str)) {
    const date = new Date(str)
    if (!Number.isNaN(date.getTime())) {
      const day = date.toLocaleDateString('fr-FR')
      const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      return time === '00:00' ? day : `${day} ${time}`
    }
  }
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/)
  if (match) {
    const hh = match[4]
    const mm = match[5]
    const day = `${match[3]}/${match[2]}/${match[1]}`
    return hh === '00' && mm === '00' ? day : `${day} ${hh}:${mm}`
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return formatAlertDateShort(str)
  const date = new Date(str)
  if (Number.isNaN(date.getTime())) return '—'
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (time === '00:00') return date.toLocaleDateString('fr-FR')
  return `${date.toLocaleDateString('fr-FR')} ${time}`
}

/**
 * Textes figés d'une alerte : titre, sous-titre quantifié (Centre d'alertes)
 * et valeur essentielle (Dashboard / détail du groupe).
 */
export function buildAlertTexts(alert) {
  const code = resolveAlertTypeCode(alert)
  if (!code) return null
  const meta = ALERT_TYPE_META[code]
  const ctx = alert?.donnees_contexte || alert?.context || {}
  const out = { type_code: code, title: meta.title, subtitle: '', essential: '' }

  if (code === 'autonomie_critique' || code === 'autonomie_preventive') {
    const heures = heuresOuZero(ctx.autonomie_heures)
    const stock = formatLitresFr(ctx.stock_actuel)
    if (heures) {
      out.subtitle = `Autonomie restante : ${heures}.${stock ? ` Stock actuel : ${stock}.` : ''}`
      out.essential = `${heures} restantes`
    }
    return out
  }

  if (code === 'conso_sans_fonctionnement') {
    const litres = formatLitresFr(ctx.quantite_conso)
    if (litres) {
      const heures = heuresOuZero(ctx.compteur_horaire || 0) || '0 h'
      out.subtitle = `Consommation enregistrée : ${litres}. Temps de fonctionnement : ${heures}.`
      out.essential = `${litres} · ${heures} de fonctionnement`
    }
    return out
  }

  if (code === 'fonctionnement_sans_consommation') {
    const heures = heuresOuZero(ctx.compteur_horaire)
    if (heures) {
      const litres = formatLitresFr(ctx.quantite_conso || 0) || '0 L'
      out.subtitle = `Temps de fonctionnement : ${heures}. Consommation enregistrée : ${litres}.`
      out.essential = `${heures} · ${litres} consommé`
    }
    return out
  }

  if (code === 'ecart_conso') {
    const latest = Number(ctx.latest_hourly)
    const previous = Number(ctx.previous_hourly)
    const ecart = Number(ctx.ecart_pourcent)
    if (Number.isFinite(latest) && Number.isFinite(previous) && previous > 0) {
      const signed = ((latest - previous) / previous) * 100
      const arrow = signed >= 0 ? '▲' : '▼'
      const dateCourant = formatAlertDateShort(ctx.date_rapport_courant)
      const dateRef = formatAlertDateShort(ctx.date_rapport_reference)
      out.subtitle = [
        `Consommation horaire${dateCourant ? ` au ${dateCourant}` : ''} : ${formatTauxFr(latest)}.`,
        `Référence${dateRef ? ` au ${dateRef}` : ''} : ${formatTauxFr(previous)}.`,
        `Écart : ${arrow}${formatPctFr(Math.abs(signed))}.`,
      ].join(' ')
      out.essential = formatPctFr(signed, { signed: true })
    } else if (Number.isFinite(ecart)) {
      out.subtitle = `Écart : ${formatPctFr(Math.abs(ecart))}.`
      out.essential = formatPctFr(ecart, { signed: true })
    }
    return out
  }

  return out
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

/** Normalise une alerte API BD vers le format UI (textes figés des 5 typologies). */
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
  const normalized = {
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
    detected_at: alert.date_detection || alert.detected_at || alert.date_apparition || null,
    target: alert.target || (alert.group_id ? 'groups' : 'site'),
    is_infinite_consumption: !!(alert.is_infinite_consumption || ctx.is_infinite_consumption),
    donnees_contexte: ctx,
  }
  // Grille figée : titre / sous-titre / valeur essentielle par typologie
  const texts = buildAlertTexts(normalized)
  if (texts) {
    normalized.type_code = texts.type_code
    normalized.title = texts.title
    if (texts.subtitle) normalized.subtitle = texts.subtitle
    normalized.essential = texts.essential || ''
  } else {
    normalized.essential = ''
  }
  return normalized
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
 * Construit la liste d’alertes à partir des lignes sites/groupes du dashboard
 * (source de repli) — codes et textes figés des 5 typologies.
 * Ajoute detected_at (ISO) pour le filtre par date côté UI.
 */
export function buildDashboardAlerts(siteRows = [], groupRows = [], detectedAt = new Date()) {
  const stamp = detectedAt instanceof Date ? detectedAt.toISOString() : String(detectedAt)

  const autonomyAlerts = siteRows.flatMap((site) => {
    // Indéterminée / sans fonctionnement : pas d’alerte d’autonomie
    if (site.is_infinite_consumption) return []
    if (site.is_infinite_autonomy || site.is_sans_fonctionnement) return []

    if (site.autonomie_hours == null) return []

    const heures = heuresOuZero(site.autonomie_hours)
    const stock = formatLitresFr(site.latest_volume)

    if (site.autonomie_hours < 24) {
      return [{
        id: `site-critique-${site.id}`,
        type: 'autonomie_critique',
        target: 'site',
        priority: 'Critique',
        priorite: 'critique',
        priority_level: 'critical',
        severity: 'critical',
        site_id: site.id,
        site_name: site.site_name,
        title: ALERT_TYPE_META.autonomie_critique.title,
        subtitle: `Autonomie restante : ${heures}.${stock ? ` Stock actuel : ${stock}.` : ''}`,
        essential: heures ? `${heures} restantes` : '',
        is_infinite_consumption: false,
        detected_at: stamp,
      }]
    }

    if (site.autonomie_hours < 36) {
      return [{
        id: `site-preventif-${site.id}`,
        type: 'autonomie_preventive',
        target: 'site',
        priority: 'Moyenne',
        priorite: 'moyenne',
        priority_level: 'medium',
        severity: 'medium',
        site_id: site.id,
        site_name: site.site_name,
        title: ALERT_TYPE_META.autonomie_preventive.title,
        subtitle: `Autonomie restante : ${heures}.${stock ? ` Stock actuel : ${stock}.` : ''}`,
        essential: heures ? `${heures} restantes` : '',
        is_infinite_consumption: false,
        detected_at: stamp,
      }]
    }

    return []
  })

  const groupWithConsNoHours = groupRows
    .filter((g) => isConsSansDelta(g))
    .map((g) => {
      const litres = formatLitresFr(g.latest_consumption) || '0 L'
      return {
        id: `group-cons-no-hours-${g.id}`,
        type: 'conso_sans_fonctionnement',
        target: 'groups',
        priority: 'Haute',
        priorite: 'haute',
        priority_level: 'high',
        severity: 'high',
        group_id: g.id,
        group_label: g.label,
        site_name: g.site_name,
        title: ALERT_TYPE_META.conso_sans_fonctionnement.title,
        subtitle: `Consommation enregistrée : ${litres}. Temps de fonctionnement : 0 h.`,
        essential: `${litres} · 0 h de fonctionnement`,
        is_infinite_consumption: true,
        ecart_pct: 0,
        detected_at: stamp,
      }
    })

  const groupWithHoursNoConsumption = groupRows
    .filter((g) => g.latest_hours > 0 && !(g.latest_consumption > 0))
    .map((g) => {
      const heures = heuresOuZero(g.latest_hours) || '0 h'
      return {
        id: `group-hours-no-cons-${g.id}`,
        type: 'fonctionnement_sans_consommation',
        target: 'groups',
        priority: 'Haute',
        priorite: 'haute',
        priority_level: 'high',
        severity: 'high',
        group_id: g.id,
        group_label: g.label,
        site_name: g.site_name,
        title: ALERT_TYPE_META.fonctionnement_sans_consommation.title,
        subtitle: `Temps de fonctionnement : ${heures}. Consommation enregistrée : 0 L.`,
        essential: `${heures} · 0 L consommé`,
        is_infinite_consumption: false,
        ecart_pct: 0,
        detected_at: stamp,
      }
    })

  const groupWithHighVariance = groupRows
    .filter((g) => isEcartConso(g))
    .map((g) => {
      const signedEcart = ((g.latest_hourly_consumption - g.previous_hourly_consumption) / g.previous_hourly_consumption) * 100
      const arrow = signedEcart >= 0 ? '▲' : '▼'
      return {
        id: `group-variance-${g.id}`,
        type: 'ecart_conso',
        target: 'groups',
        priority: 'Moyenne',
        priorite: 'moyenne',
        priority_level: 'medium',
        severity: 'medium',
        group_id: g.id,
        group_label: g.label,
        site_name: g.site_name,
        title: ALERT_TYPE_META.ecart_conso.title,
        subtitle: [
          `Consommation horaire semaine N : ${formatTauxFr(g.latest_hourly_consumption)}.`,
          `Référence semaine N-1 : ${formatTauxFr(g.previous_hourly_consumption)}.`,
          `Écart : ${arrow}${formatPctFr(Math.abs(signedEcart))}.`,
        ].join(' '),
        essential: formatPctFr(signedEcart, { signed: true }),
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
  return String(subtitle).split(/(▲\s?[\d.,]+\s?%|▼\s?[\d.,]+\s?%)/).map((part) => {
    const arrowMatch = part.match(/^(▲|▼)\s?([\d.,]+)\s?%$/)
    if (arrowMatch) {
      return { kind: 'arrow', up: arrowMatch[1] === '▲', text: `${arrowMatch[1]}${arrowMatch[2]} %` }
    }
    return { kind: 'text', text: part }
  })
}
