/**
 * Composant de filtre de dates basé sur les données réelles.
 * Affiche des dates réelles tirées des données de rapports.
 */

import React, { useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import { useDateFilter, parseDate, formatDateFR } from '@/hooks/useDateFilter.js'

/**
 * @param {Object} props
 * @param {Array} props.rapportChoices - Liste des choix de rapports avec dates
 * @param {string|null} props.dateDebut - Valeur actuelle du filtre début (ISO)
 * @param {string|null} props.dateFin - Valeur actuelle du filtre fin (ISO)
 * @param {Function} props.onDateDebutChange - Callback lors du changement de date début
 * @param {Function} props.onDateFinChange - Callback lors du changement de date fin
 * @param {boolean} props.disabled - Désactiver les contrôles
 * @param {string} props.label - Label optionnel pour le groupe
 */
export function DateRangeFilter({
  rapportChoices,
  dateDebut,
  dateFin,
  onDateDebutChange,
  onDateFinChange,
  disabled = false,
  label = 'Période',
}) {
  const { dateOptions } = useDateFilter(rapportChoices)

  // Trouver les options sélectionnées
  const selectedDebut = useMemo(() => {
    if (!dateDebut) return null
    return dateOptions.find((opt) => opt.value === dateDebut || opt.label === dateDebut)
  }, [dateOptions, dateDebut])

  const selectedFin = useMemo(() => {
    if (!dateFin) return null
    return dateOptions.find((opt) => opt.value === dateFin || opt.label === dateFin)
  }, [dateOptions, dateFin])

  // Gérer le changement de date début
  const handleDebutChange = (e) => {
    const value = e.target.value
    if (onDateDebutChange) {
      onDateDebutChange(value)
    }
  }

  // Gérer le changement de date fin
  const handleFinChange = (e) => {
    const value = e.target.value
    if (onDateFinChange) {
      onDateFinChange(value)
    }
  }

  // Si pas d'options, ne rien afficher
  if (dateOptions.length === 0) {
    return (
      <div className="date-filter-empty">
        <span className="muted">Aucune date disponible</span>
      </div>
    )
  }

  return (
    <>
      <div className="date-filter-field">
        <label htmlFor="date-debut-filter">{label} — début</label>
        <div className="date-select-wrap">
          <select
            id="date-debut-filter"
            value={dateDebut || ''}
            disabled={disabled}
            onChange={handleDebutChange}
          >
            <option value="">— Sélectionner —</option>
            {dateOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="date-select-icon" />
        </div>
      </div>

      <div className="date-filter-field">
        <label htmlFor="date-fin-filter">{label} — fin</label>
        <div className="date-select-wrap">
          <select
            id="date-fin-filter"
            value={dateFin || ''}
            disabled={disabled}
            onChange={handleFinChange}
          >
            <option value="">— Sélectionner —</option>
            {dateOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="date-select-icon" />
        </div>
      </div>
    </>
  )
}

/**
 * Version simple du filtre de dates qui utilise directement des inputs date HTML5.
 * Plus simple et cohérent avec les données réelles.
 */
export function SimpleDateFilter({
  rapportChoices,
  dateDebut,
  dateFin,
  onDateDebutChange,
  onDateFinChange,
  disabled = false,
  label = 'Période',
}) {
  const { minDate, maxDate } = useDateFilter(rapportChoices)

  // Formater pour input type="date"
  const toInputDate = (date) => {
    if (!date) return ''
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return (
    <>
      <div className="date-filter-field">
        <label htmlFor="simple-date-debut">{label} — début</label>
        <div className="date-input-wrap">
          <input
            type="date"
            id="simple-date-debut"
            value={dateDebut ? toInputDate(dateDebut) : ''}
            disabled={disabled}
            onChange={(e) => {
              const value = e.target.value
              // Convertir de YYYY-MM-DD vers ISO
              if (value && onDateDebutChange) {
                onDateDebutChange(value)
              } else if (onDateDebutChange) {
                onDateDebutChange('')
              }
            }}
            min={minDate ? toInputDate(minDate) : ''}
            max={maxDate ? toInputDate(maxDate) : ''}
          />
        </div>
      </div>

      <div className="date-filter-field">
        <label htmlFor="simple-date-fin">{label} — fin</label>
        <div className="date-input-wrap">
          <input
            type="date"
            id="simple-date-fin"
            value={dateFin ? toInputDate(dateFin) : ''}
            disabled={disabled}
            onChange={(e) => {
              const value = e.target.value
              if (value && onDateFinChange) {
                onDateFinChange(value)
              } else if (onDateFinChange) {
                onDateFinChange('')
              }
            }}
            min={minDate ? toInputDate(minDate) : ''}
            max={maxDate ? toInputDate(maxDate) : ''}
          />
        </div>
      </div>
    </>
  )
}

export default DateRangeFilter
