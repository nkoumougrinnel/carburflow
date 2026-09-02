/**
 * Hook personnalisé pour gérer le filtre de dates basé sur les données réelles.
 * Propose des dates basées sur les données existantes (rapports).
 */

import { useMemo } from 'react'

/**
 * Parse une date ISO en objet Date.
 * @param {string|null|undefined} dateStr
 * @returns {Date|null}
 */
export function parseDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Formate une date pour affichage français.
 * @param {Date} date
 * @returns {string}
 */
export function formatDateFR(date) {
  if (!date) return ''
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Formate une date pour un attribut datetime-local (input HTML5).
 * @param {Date} date
 * @returns {string}
 */
export function toInputFormat(date) {
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Hook pour analyser et valider les dates depuis rapport_choices.
 * @param {Array} rapportChoices - Liste des choix de rapports avec date_debut et date_fin
 * @returns {Object} - { dateOptions, minDate, maxDate }
 */
export function useDateFilter(rapportChoices) {
  return useMemo(() => {
    if (!rapportChoices || rapportChoices.length === 0) {
      return {
        dateOptions: [],
        minDate: null,
        maxDate: null,
      }
    }

    // Extraire toutes les dates uniques
    const allDates = new Set()
    const dateDetails = new Map()

    rapportChoices.forEach((choice) => {
      // Ajouter date_debut si disponible
      if (choice.date_debut) {
        allDates.add(choice.date_debut)
        if (!dateDetails.has(choice.date_debut)) {
          dateDetails.set(choice.date_debut, {
            date: parseDate(choice.date_debut),
            label: formatDateFR(parseDate(choice.date_debut)),
            value: choice.id,
          })
        }
      }
      // Ajouter date_fin si disponible
      if (choice.date_fin) {
        allDates.add(choice.date_fin)
        if (!dateDetails.has(choice.date_fin)) {
          dateDetails.set(choice.date_fin, {
            date: parseDate(choice.date_fin),
            label: formatDateFR(parseDate(choice.date_fin)),
            value: choice.id,
          })
        }
      }
    })

    // Trier les dates chronologiquement
    const sortedDates = Array.from(allDates)
      .map((d) => ({ iso: d, date: parseDate(d) }))
      .filter((item) => item.date !== null)
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    // Construire les options de dates uniques
    const seenLabels = new Set()
    const dateOptions = []
    sortedDates.forEach((item) => {
      const label = formatDateFR(item.date)
      if (!seenLabels.has(label)) {
        seenLabels.add(label)
        dateOptions.push({
          label,
          value: item.iso,
          date: item.date,
        })
      }
    })

    return {
      dateOptions,
      minDate: sortedDates.length > 0 ? sortedDates[0].date : null,
      maxDate: sortedDates.length > 0 ? sortedDates[sortedDates.length - 1].date : null,
    }
  }, [rapportChoices])
}

/**
 * Trouve les choix de rapports qui correspondent à une plage de dates.
 * @param {Array} rapportChoices - Liste des choix de rapports
 * @param {string|null} dateDebut - Date de début ISO
 * @param {string|null} dateFin - Date de fin ISO
 * @returns {Object} - { debutId, finId }
 */
export function findRapportIdsForDateRange(rapportChoices, dateDebut, dateFin) {
  if (!rapportChoices || rapportChoices.length === 0) {
    return { debutId: null, finId: null }
  }

  const debutDate = parseDate(dateDebut)
  const finDate = parseDate(dateFin)

  let debutId = null
  let finId = null

  rapportChoices.forEach((choice) => {
    const choiceDebut = parseDate(choice.date_debut)
    const choiceFin = parseDate(choice.date_fin)

    // Pour le rapport de début, on cherche celui dont date_debut >= dateDebut
    if (debutDate && choiceDebut && !debutId) {
      if (choiceDebut.getTime() >= debutDate.getTime()) {
        debutId = choice.id
      }
    }

    // Pour le rapport de fin, on cherche celui dont date_fin <= dateFin
    if (finDate && choiceFin && !finId) {
      if (choiceFin.getTime() <= finDate.getTime()) {
        finId = choice.id
      }
    }
  })

  return { debutId, finId }
}

/**
 * Convertit les valeurs de dates en IDs de rapports.
 * @param {Array} rapportChoices
 * @param {string} dateDebutValue - Valeur du sélecteur début
 * @param {string} dateFinValue - Valeur du sélecteur fin
 * @returns {Object} - { rapportDebutId, rapportFinId }
 */
export function datesToRapportIds(rapportChoices, dateDebutValue, dateFinValue) {
  if (!rapportChoices || rapportChoices.length === 0) {
    return { rapportDebutId: null, rapportFinId: null }
  }

  // Chercher le rapport qui contient la date de début
  const debutDate = parseDate(dateDebutValue)
  const finDate = parseDate(dateFinValue)

  let rapportDebutId = null
  let rapportFinId = null

  rapportChoices.forEach((choice) => {
    const choiceDebut = parseDate(choice.date_debut)
    const choiceFin = parseDate(choice.date_fin)

    // Trouver le rapport dont la plage contient dateDebutValue
    if (debutDate && choiceDebut && choiceFin) {
      if (debutDate.getTime() >= choiceDebut.getTime() && debutDate.getTime() <= choiceFin.getTime()) {
        rapportDebutId = choice.id
      }
    }

    // Trouver le rapport dont la plage contient dateFinValue
    if (finDate && choiceDebut && choiceFin) {
      if (finDate.getTime() >= choiceDebut.getTime() && finDate.getTime() <= choiceFin.getTime()) {
        rapportFinId = choice.id
      }
    }
  })

  // Fallback: utiliser les premiers et derniers rapports
  if (!rapportDebutId && rapportChoices.length > 0) {
    rapportDebutId = rapportChoices[0].id
  }
  if (!rapportFinId && rapportChoices.length > 0) {
    rapportFinId = rapportChoices[rapportChoices.length - 1].id
  }

  return { rapportDebutId, rapportFinId }
}
