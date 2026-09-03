/**
 * Composant de filtre de dates basé sur les données réelles.
 * Affiche des dates réelles tirées des données de rapports.
 */

import React, { useMemo, useState } from 'react'
import { ChevronDown, Calendar } from 'lucide-react'
import { useDateFilter, parseDate, formatDateFR, toInputFormat } from '@/hooks/useDateFilter.js'

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

/**
 * PeriodFilter — barre de filtre unifiée pour les relevés / dashboard.
 *
 * Une seule ligne horizontale avec :
 *   - boutons rapides (Toutes / 7j / 30j / 90j)
 *   - bouton toggle "Période spécifique" qui révèle deux date pickers
 *   - bouton "Appliquer"
 *   - bouton "Réinitialiser" (visible dès qu'un filtre est actif)
 *
 * @param {Object} props
 * @param {Array} props.rapportChoices
 * @param {string|null} props.dateDebut
 * @param {string|null} props.dateFin
 * @param {Function} props.onDateDebutChange
 * @param {Function} props.onDateFinChange
 * @param {Function} props.onApply
 * @param {Function} props.onReset
 * @param {string|null} props.activeQuick - 'all' | '7d' | '30d' | '90d' | 'custom' | null
 * @param {Function} props.onQuickChange
 */
export function PeriodFilter({
  rapportChoices,
  dateDebut,
  dateFin,
  onDateDebutChange,
  onDateFinChange,
  onApply,
  onReset,
  activeQuick = 'all',
  onQuickChange,
}) {
  const { minDate, maxDate } = useDateFilter(rapportChoices)
  const [showCustom, setShowCustom] = useState(activeQuick === 'custom')

  const handleQuick = (key) => {
    if (onQuickChange) onQuickChange(key)
    if (key === 'all') {
      setShowCustom(false)
      if (onDateDebutChange) onDateDebutChange('')
      if (onDateFinChange) onDateFinChange('')
      if (onApply) onApply({ debut: '', fin: '' })
      if (onReset) onReset()
    } else if (['7d', '30d', '90d'].includes(key)) {
      setShowCustom(false)
      const days = key === '7d' ? 7 : key === '30d' ? 30 : 90
      const end = maxDate || new Date()
      const start = new Date(end)
      start.setDate(start.getDate() - (days - 1))
      const startIso = toInputFormat(start < (minDate || start) ? minDate : start)
      const endIso = toInputFormat(end)
      if (onDateDebutChange) onDateDebutChange(startIso)
      if (onDateFinChange) onDateFinChange(endIso)
      if (onApply) onApply({ debut: startIso, fin: endIso })
    } else if (key === 'custom') {
      setShowCustom(true)
    }
  }

  const handleCustomToggle = () => {
    const next = !showCustom
    setShowCustom(next)
    if (onQuickChange) onQuickChange(next ? 'custom' : 'all')
    if (!next) {
      if (onDateDebutChange) onDateDebutChange('')
      if (onDateFinChange) onDateFinChange('')
      if (onApply) onApply()
    }
  }

  const handleApply = () => {
    if (onApply) onApply({ debut: dateDebut, fin: dateFin })
  }

  const handleReset = () => {
    setShowCustom(false)
    if (onQuickChange) onQuickChange('all')
    if (onReset) onReset()
  }

  const hasFilter = Boolean(dateDebut || dateFin || showCustom)

  const QUICK_OPTIONS = [
    { key: 'all', label: 'Toutes' },
    { key: '7d', label: '7 jours' },
    { key: '30d', label: '30 jours' },
    { key: '90d', label: '90 jours' },
  ]

  return (
    <div className="period-filter-bar">
      <div className="period-filter-group">
        <span className="period-filter-label">Période</span>
        <div className="period-filter-quick" role="group" aria-label="Sélecteur rapide de période">
          {QUICK_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={`period-filter-quick-btn${activeQuick === opt.key ? ' is-active' : ''}`}
              onClick={() => handleQuick(opt.key)}
              aria-pressed={activeQuick === opt.key}
            >
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            className={`period-filter-quick-btn${activeQuick === 'custom' ? ' is-active' : ''}`}
            onClick={handleCustomToggle}
            aria-pressed={activeQuick === 'custom'}
          >
            <Calendar size={14} aria-hidden="true" />
            <span>Période spécifique</span>
          </button>
        </div>
      </div>

      {showCustom ? (
        <div className="period-filter-dates">
          <div className="date-filter-field">
            <label htmlFor="period-date-debut">Début</label>
            <div className="date-input-wrap">
              <input
                type="date"
                id="period-date-debut"
                value={dateDebut ? toInputFormat(parseDate(dateDebut) || new Date(dateDebut)) : ''}
                min={minDate ? toInputFormat(minDate) : ''}
                max={dateFin ? toInputFormat(parseDate(dateFin) || new Date(dateFin)) : (maxDate ? toInputFormat(maxDate) : '')}
                onChange={(e) => onDateDebutChange && onDateDebutChange(e.target.value)}
              />
            </div>
          </div>
          <div className="date-filter-field">
            <label htmlFor="period-date-fin">Fin</label>
            <div className="date-input-wrap">
              <input
                type="date"
                id="period-date-fin"
                value={dateFin ? toInputFormat(parseDate(dateFin) || new Date(dateFin)) : ''}
                min={dateDebut ? toInputFormat(parseDate(dateDebut) || new Date(dateDebut)) : (minDate ? toInputFormat(minDate) : '')}
                max={maxDate ? toInputFormat(maxDate) : ''}
                onChange={(e) => onDateFinChange && onDateFinChange(e.target.value)}
              />
            </div>
          </div>
          <button
            type="button"
            className="period-filter-apply"
            onClick={handleApply}
            disabled={!dateDebut || !dateFin}
          >
            Appliquer
          </button>
        </div>
      ) : null}

      {hasFilter && activeQuick !== 'all' ? (
        <button
          type="button"
          className="period-filter-reset"
          onClick={handleReset}
        >
          Réinitialiser
        </button>
      ) : null}
    </div>
  )
}
