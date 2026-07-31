/**
 * Formate un nombre d'heures de temps restant en chaîne lisible.
 * Ex. 14 → "14 h", 54 → "2 j 6 h"
 */
export function formatAutonomy(hours) {
  if (hours == null || Number.isNaN(hours)) return '—'
  if (hours <= 0) return '0 h'
  const totalMinutes = Math.round(hours * 60)
  const totalHours = Math.round(totalMinutes / 60)
  if (totalHours < 24) return `${totalHours} h`
  const days = Math.floor(totalHours / 24)
  const remHours = totalHours % 24
  if (remHours === 0) return `${days} j`
  return `${days} j ${remHours} h`
}

/**
 * Niveau de temps restant pour l'UI : critical | medium | low | ok | idle | unknown
 * - critical : autonomie réelle < 24 h
 * - medium   : 24–36 h
 * - low      : 36–72 h
 * - ok       : ≥ 72 h
 * - unknown  : consommation sans horaire (ex-0 h) → Indéterminée, pas d’autonomie
 * - idle     : sans fonctionnement (ex-Indéterminée / données à 0)
 */
export function getAutonomySeverity(entity = {}) {
  // Conso sans delta horaire : pas d’autonomie chiffrée → Indéterminée
  if (entity.is_infinite_consumption) return 'unknown'
  // Données manquantes / zéros → Sans fonctionnement
  if (entity.is_sans_fonctionnement) return 'idle'
  if (entity.is_infinite_autonomy || entity.formatted_autonomy === '∞') return 'idle'
  const hrs = entity.autonomie_hours
  if (hrs == null || Number.isNaN(Number(hrs))) return 'idle'
  if (hrs < 24) return 'critical'
  if (hrs < 36) return 'medium'
  if (hrs < 72) return 'low'
  return 'ok'
}

export function getAutonomySeverityLabel(severity) {
  if (severity === 'critical') return 'Urgent'
  if (severity === 'medium') return 'À surveiller'
  if (severity === 'low') return 'Attention'
  if (severity === 'ok') return 'Confortable'
  if (severity === 'idle') return 'Sans fonctionnement'
  if (severity === 'unknown') return 'Indéterminée'
  return 'Non disponible'
}

/**
 * Valeur courte affichée dans les tableaux / pastilles.
 * Jamais "∞" ni "0 h" pour la conso sans horaire : Indéterminée.
 */
export function formatAutonomyValue(entity = {}) {
  if (entity.is_infinite_consumption) return 'Indét.'
  if (entity.is_sans_fonctionnement) return 'Sans fct.'
  if (entity.is_infinite_autonomy || entity.formatted_autonomy === '∞') return 'Sans fct.'
  // Ancien payload « 0h » sans flag : ne jamais afficher comme urgence chiffrée ici
  // si le backend marque encore 0h pour indéterminée (rétrocompat).
  if (
    (entity.formatted_autonomy === '0h' || entity.formatted_autonomy === '0 h')
    && entity.is_infinite_consumption
  ) {
    return 'Indét.'
  }
  if (entity.formatted_autonomy && entity.formatted_autonomy !== '∞' && entity.formatted_autonomy !== '0h') {
    return String(entity.formatted_autonomy)
      .replace(/(\d+)j(\d+)h/, '$1 j $2 h')
      .replace(/(\d+)j$/, '$1 j')
      .replace(/(\d+)h$/, '$1 h')
  }
  if (entity.autonomie_hours != null) return formatAutonomy(entity.autonomie_hours)
  return '—'
}

/**
 * Phrase d’aide au survol / accessibilité.
 */
export function getAutonomyHint(entity = {}) {
  if (entity.is_infinite_consumption) {
    return 'Consommation détectée sans delta horaire : autonomie indéterminée (non calculable).'
  }
  if (entity.is_sans_fonctionnement) {
    return entity.indet_reason
      || 'Pas de fonctionnement relevé sur la période (valeurs à 0).'
  }
  if (entity.is_infinite_autonomy || entity.formatted_autonomy === '∞') {
    return entity.indet_reason
      || 'Données insuffisantes pour un fonctionnement calculable → sans fonctionnement.'
  }
  const severity = getAutonomySeverity(entity)
  if (severity === 'critical') return 'Moins de 24 heures de temps restant — action rapide recommandée.'
  if (severity === 'medium') return 'Entre 24 et 36 heures de temps restant — à surveiller de près.'
  if (severity === 'low') return 'Entre 36 et 72 heures de temps restant — planifiez un réapprovisionnement.'
  if (severity === 'ok') return 'Plus de 72 heures de temps restant — situation confortable.'
  return 'Temps restant non disponible pour le moment.'
}

/**
 * Libellés métier partagés — jargon Groupes.
 * Consommation horaire · Consommation · Delta horaire · Temps restant
 */
export const METRIC_LABELS = {
  totalPeriod: 'Total sur la période de la courbe',
  averagePeriod: 'Moyenne',
  habitualAverage: 'Moyenne',
  variability: 'Écart-type',
  hoursMean: 'Delta horaire moy. (h)',
  consumptionMean: 'Consommation moyenne (L)',
  hourlyConsumptionMean: 'Consommation horaire moy. (L/h)',
  consumptionWeekN: 'Consommation semaine N (L)',
  consumptionWeekN1: 'Consommation semaine N-1 (L)',
  hoursDeltaMean: 'Delta horaire moyen (h)',
  hoursDeltaWeekN: 'Delta horaire semaine N (h)',
  autonomyRemaining: 'Temps restant',
  noPreviousPeriod: 'Pas de période précédente pour comparer',
  consumption: 'Consommation',
  hourlyConsumption: 'Consommation horaire',
  hoursDelta: 'Delta horaire',
  sansFonctionnement: 'Sans fonctionnement',
  indeterminee: 'Indéterminée',
}
