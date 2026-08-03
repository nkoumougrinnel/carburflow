import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Bell, CheckCircle2, History } from 'lucide-react'
import Topbar from '../components/Topbar.jsx'
import PageEnter from '../components/PageEnter.jsx'
import PageLoader from '../components/PageLoader.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { listAlertes, treatAlert } from '../auth.js'
import { requestBadgesRefresh } from '../utils/badges.js'
import {
  PRIORITE_META,
  countAlertsBySeverity,
  filterAlerts,
  isIndeterminateAutonomyAlert,
  normalizePersistedAlert,
  splitAlertSubtitle,
} from '../utils/alerts.js'

/* ————— Petits outils de formatage ————— */

function AlertSubtitle({ subtitle }) {
  const parts = splitAlertSubtitle(subtitle)
  if (!parts.length) return null
  return (
    <>
      {parts.map((part, i) => (
        part.kind === 'arrow' ? (
          <span key={i} style={{ color: part.up ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
            {part.text}
          </span>
        ) : (
          <span key={i}>{part.text}</span>
        )
      ))}
    </>
  )
}

function formatWhen(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

function filterByPeriod(rows, period) {
  if (period === 'all' || !period) return rows
  const days = { '7d': 7, '30d': 30, '90d': 90 }[period]
  if (!days) return rows
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return rows.filter((row) => {
    const stamp = row.date_traitement || row.detected_at
    if (!stamp) return false
    const t = new Date(stamp).getTime()
    return Number.isFinite(t) && t >= cutoff
  })
}

const REASON_PRESETS = [
  { id: 'resolved-on-site', label: 'Résolu sur site', text: 'Résolu directement sur site par l’équipe terrain.' },
  { id: 'false-positive', label: 'Faux positif', text: 'Faux positif détecté à la vérification — aucune action requise.' },
  { id: 'followup', label: 'Suivi en cours', text: 'Suivi en cours — alerte transmise à l’équipe responsable pour traitement.' },
]
const MIN_JUSTIF = 20
const MAX_JUSTIF = 280

/* ————— Bandeau principal ————— */

function AlertsHero({ counts }) {
  const total = counts?.total || 0
  const critical = counts?.critique || 0
  const high = counts?.haute || 0

  if (total === 0) {
    return (
      <section className="alx-hero alx-hero--ok" aria-live="polite">
        <span className="alx-hero-badge">État actuel</span>
        <h1>Tout est sous contrôle.</h1>
        <p>
          Aucune alerte à traiter. Si une situation demande votre attention,
          elle apparaîtra ici automatiquement.
        </p>
      </section>
    )
  }

  const tone = critical > 0 ? 'danger' : high > 0 ? 'warn' : 'warn'

  return (
    <section className={`alx-hero alx-hero--${tone}`} aria-live="polite">
      <span className="alx-hero-badge">Ce qui demande votre attention</span>
      <h1>
        {total === 1 ? '1 alerte' : `${total} alertes`}
        {critical > 0 ? ' à traiter rapidement' : ' à surveiller'}
      </h1>
      <p>
        {critical > 0
          ? `${critical} situation${critical > 1 ? 's' : ''} critique${critical > 1 ? 's' : ''} — à traiter en priorité. Cliquez sur « Marquer comme traitée » une fois résolu.`
          : 'Rien de critique aujourd’hui, mais quelques points méritent un œil attentif.'}
      </p>
    </section>
  )
}

/* ————— Tuiles de filtre par sévérité ————— */

const SEVERITY_OPTIONS = [
  { id: 'all', label: 'Toutes', key: 'total', tone: 'all' },
  { id: 'critique', label: 'Critiques', key: 'critique', tone: 'critical' },
  { id: 'haute', label: 'Hautes', key: 'haute', tone: 'high' },
  { id: 'moyenne', label: 'Moyennes', key: 'moyenne', tone: 'medium' },
  { id: 'basse', label: 'Basses', key: 'basse', tone: 'low' },
]

function SeverityTiles({ counts, value, onChange }) {
  return (
    <div className="alx-tiles" role="group" aria-label="Filtrer les alertes par niveau">
      {SEVERITY_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`alx-tile alx-tile--${option.tone}${value === option.id ? ' is-active' : ''}`}
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
        >
          <span className="alx-tile-label">{option.label}</span>
          <strong className="alx-tile-count">{counts?.[option.key] ?? 0}</strong>
        </button>
      ))}
    </div>
  )
}

/* ————— Onglets À traiter / Historique ————— */

function AlertsTabs({ items, value, onChange }) {
  return (
    <div className="alx-tabs" role="tablist" aria-label="Sections des alertes">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={value === item.id}
            className={`alx-tab${value === item.id ? ' is-active' : ''}`}
            onClick={() => onChange(item.id)}
          >
            {Icon ? <Icon size={17} aria-hidden="true" /> : null}
            {item.label}
            {item.badge != null && item.badge > 0 ? (
              <span className="alx-tab-badge">{item.badge}</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

function PeriodChips({ value, onChange }) {
  const options = [
    { id: '7d', label: '7 jours' },
    { id: '30d', label: '30 jours' },
    { id: '90d', label: '90 jours' },
    { id: 'all', label: 'Tout' },
  ]
  return (
    <div className="alx-period" role="group" aria-label="Filtrer par période">
      <span className="alx-period-label">Période :</span>
      <div className="alx-period-chips">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`alx-period-chip${value === option.id ? ' is-active' : ''}`}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ————— Carte d’alerte ————— */

function AlertCard({ alert, panel, isAdmin, isFocused, onOpen, onTreat, delay = 0 }) {
  const severity = alert.severity || 'medium'
  const label = alert.priority || PRIORITE_META[alert.priorite]?.label || 'Moyenne'
  const when = panel === 'history'
    ? formatWhen(alert.date_traitement || alert.detected_at)
    : formatWhen(alert.detected_at)
  const author = alert.traite_par_username || alert.traite_par || null

  return (
    <article
      id={`alert-card-${alert.id}`}
      className={`alx-card alx-card--${severity}${isFocused ? ' is-focused' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="alx-card-rail" aria-hidden="true" />
      <div className="alx-card-body">
        <header className="alx-card-head">
          <span className={`alx-pill alx-pill--${severity}`}>{label}</span>
          <span className="alx-card-date">
            {panel === 'history' ? `Traité le ${when}` : when}
            {panel === 'history' && author ? ` · ${author}` : ''}
          </span>
        </header>

        <h3>{alert.title}</h3>

        {alert.subtitle ? (
          <p className="alx-card-text">
            <AlertSubtitle subtitle={alert.subtitle} />
          </p>
        ) : null}

        {panel === 'history' && alert.justification ? (
          <p className="alx-card-justif">
            <strong>Note de traitement :</strong> {alert.justification}
          </p>
        ) : null}

        <footer className="alx-card-actions">
          <button type="button" className="alx-btn alx-btn--ghost" onClick={onOpen}>
            {alert.target === 'groups' ? 'Ouvrir le groupe' : 'Ouvrir le site'}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
          {isAdmin && panel === 'active' && (
            <button type="button" className="alx-btn alx-btn--primary" onClick={onTreat}>
              <CheckCircle2 size={17} aria-hidden="true" />
              Marquer comme traitée
            </button>
          )}
        </footer>
      </div>
    </article>
  )
}

/* ————— État vide ————— */

function EmptyState({ panel }) {
  if (panel === 'history') {
    return (
      <div className="alx-empty">
        <div className="alx-empty-icon"><History size={28} aria-hidden="true" /></div>
        <h3>Aucune alerte dans cette période.</h3>
        <p>Changez la période ou le niveau pour retrouver plus d’historique.</p>
      </div>
    )
  }
  return (
    <div className="alx-empty">
      <div className="alx-empty-icon"><CheckCircle2 size={30} aria-hidden="true" /></div>
      <h3>Rien à signaler, tout va bien.</h3>
      <p>Les alertes apparaîtront ici dès qu’une situation demandera votre attention.</p>
    </div>
  )
}

/* ————— Modal de traitement ————— */

function TreatAlertModal({ alert, onClose, onConfirm, title }) {
  const [justification, setJustification] = useState('')
  const [reasonId, setReasonId] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const applyReason = (preset) => {
    setReasonId(preset.id)
    setJustification(preset.text)
  }

  const length = justification.trim().length
  const tooShort = length > 0 && length < MIN_JUSTIF

  const submit = async (event) => {
    event.preventDefault()
    const text = justification.trim()
    if (text.length < MIN_JUSTIF) {
      setError(`Veuillez écrire au moins ${MIN_JUSTIF} caractères.`)
      return
    }
    if (text.length > MAX_JUSTIF) {
      setError(`Veuillez rester sous ${MAX_JUSTIF} caractères.`)
      return
    }
    setSaving(true)
    setError('')
    try {
      await onConfirm(text)
    } catch (err) {
      setError(err.message || 'Impossible d’enregistrer le traitement.')
      setSaving(false)
    }
  }

  return (
    <div className="rapport-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="rapport-modal alert-treat-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="alert-treat-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="rapport-modal-head">
          <div>
            <p className="rapport-modal-kicker">Résolution</p>
            <h2 id="alert-treat-title">{title || 'Marquer comme traitée'}</h2>
            <p>{alert.title}</p>
          </div>
          <button type="button" className="rapport-modal-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>

        <form className="rapport-modal-form" onSubmit={submit}>
          <div className="cf-reason-chips" role="group" aria-label="Justifications rapides">
            {REASON_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`cf-reason-chip${reasonId === preset.id ? ' is-active' : ''}`}
                onClick={() => applyReason(preset)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <label className="alert-treat-field">
            <span>Pourquoi cette alerte est-elle traitée ?</span>
            <textarea
              value={justification}
              onChange={(event) => {
                setJustification(event.target.value)
                setReasonId('')
              }}
              rows={5}
              placeholder={`Expliquez en ${MIN_JUSTIF} caractères minimum…`}
              required
              autoFocus
            />
            <span className={`cf-reason-counter${tooShort ? ' is-error' : ''}`}>
              {length}/{MAX_JUSTIF}
            </span>
          </label>
          {error && <p className="alert-treat-error" role="alert">{error}</p>}
          <div className="rapport-modal-actions">
            <button type="button" className="reports-btn reports-btn--ghost" onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <button type="submit" className="reports-btn reports-btn--primary" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Confirmer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ————— Page ————— */

function AlertsPage({ onNavigate }) {
  const { isAdmin } = useAuth()
  const [alertsRaw, setAlertsRaw] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [message, setMessage] = useState('')
  const [panel, setPanel] = useState(() => {
    const status = new URLSearchParams(window.location.search).get('status')
    return status === 'treated' || status === 'history' ? 'history' : 'active'
  })
  const [priority, setPriority] = useState(() => new URLSearchParams(window.location.search).get('priority') || 'all')
  const [focusAlertId, setFocusAlertId] = useState(() => new URLSearchParams(window.location.search).get('alertId') || '')
  const [period, setPeriod] = useState('all')
  const [pendingTreat, setPendingTreat] = useState(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await listAlertes({ etat: 'all' })
      setAlertsRaw(Array.isArray(rows) ? rows : [])
      setLoadError('')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    loadAll().catch((err) => {
      if (!cancelled) {
        setLoadError(err.message || 'Impossible de charger les alertes.')
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [loadAll])

  useEffect(() => {
    const params = new URLSearchParams()
    if (panel === 'history') params.set('status', 'history')
    if (priority !== 'all') params.set('priority', priority)
    if (focusAlertId) params.set('alertId', focusAlertId)
    const qs = params.toString()
    window.history.replaceState({}, '', qs ? `/alertes/?${qs}` : '/alertes/')
  }, [panel, priority, focusAlertId])

  useEffect(() => {
    if (!message) return undefined
    const timer = window.setTimeout(() => setMessage(''), 5000)
    return () => window.clearTimeout(timer)
  }, [message])

  const alerts = useMemo(
    () => (alertsRaw || []).map(normalizePersistedAlert).filter(Boolean),
    [alertsRaw],
  )

  const activeAlerts = useMemo(
    () => alerts.filter((alert) => !alert.traitee && alert.etat !== 'ignoree' && !isIndeterminateAutonomyAlert(alert)),
    [alerts],
  )

  const historyAlerts = useMemo(
    () => alerts
      .filter((alert) => alert.traitee || alert.etat === 'ignoree' || alert.etat === 'traitee')
      .sort((a, b) => {
        const ta = new Date(a.date_traitement || a.detected_at || 0).getTime()
        const tb = new Date(b.date_traitement || b.detected_at || 0).getTime()
        return tb - ta
      }),
    [alerts],
  )

  useEffect(() => {
    if (!focusAlertId || loading) return
    const inActive = activeAlerts.some((alert) => String(alert.id) === String(focusAlertId))
    const inHistory = historyAlerts.some((alert) => String(alert.id) === String(focusAlertId))
    if (inHistory && !inActive) setPanel('history')
    else if (inActive) setPanel('active')

    const timer = window.setTimeout(() => {
      const element = document.getElementById(`alert-card-${focusAlertId}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        element.classList.add('is-focused')
        window.setTimeout(() => element.classList.remove('is-focused'), 2200)
      }
    }, 120)
    return () => window.clearTimeout(timer)
  }, [focusAlertId, loading, activeAlerts, historyAlerts])

  const counts = useMemo(() => countAlertsBySeverity(activeAlerts), [activeAlerts])
  const historyCounts = useMemo(() => countAlertsBySeverity(historyAlerts), [historyAlerts])

  const filterStatus = panel === 'history' ? 'history' : 'active'
  const sourceAlerts = panel === 'history' ? historyAlerts : activeAlerts
  const periodFiltered = useMemo(
    () => filterByPeriod(sourceAlerts, period),
    [sourceAlerts, period],
  )
  const visible = useMemo(
    () => filterAlerts(periodFiltered, {
      priority,
      type: 'all',
      dateRange: 'all',
      status: filterStatus,
    }),
    [periodFiltered, priority, filterStatus],
  )

  const navItems = useMemo(() => ([
    {
      id: 'active',
      label: 'À traiter',
      icon: Bell,
      badge: activeAlerts.length,
    },
    {
      id: 'history',
      label: 'Historique',
      icon: History,
    },
  ]), [activeAlerts.length])

  const openAlert = (alert) => {
    if (alert.target === 'groups') {
      onNavigate({ view: 'groups', groupId: alert.group_id, groupLabel: alert.group_label })
    } else {
      onNavigate({ view: 'sites', siteId: alert.site_id, siteName: alert.site_name, mode: 'details' })
    }
  }

  const confirmTreat = async (justification) => {
    const alert = pendingTreat
    if (!alert) return
    const result = await treatAlert({
      cle: alert.id,
      justification,
      title: alert.title,
      subtitle: alert.subtitle,
      type: alert.type,
      severity: alert.severity,
      site_id: alert.site_id || null,
      group_id: alert.group_id || null,
    })
    const saved = result?.alerte
    setAlertsRaw((prev) => prev.map((row) => {
      const cle = row.cle || row.id
      if (cle !== alert.id) return row
      return {
        ...row,
        etat: 'traitee',
        traitee: true,
        justification: saved?.justification || justification,
        date_traitement: saved?.date_traitement || new Date().toISOString(),
        traite_par_username: saved?.traite_par_username || null,
      }
    }))
    setPendingTreat(null)
    setMessage('Alerte marquée comme traitée.')
    requestBadgesRefresh({ source: 'alerts' })
  }

  if (loading) {
    return (
      <div className="app-shell dashboard-shell">
        <Topbar activeView="alerts" onNavigate={onNavigate} />
        <PageLoader label="Chargement des alertes…" />
      </div>
    )
  }

  if (loadError && !alertsRaw.length) {
    return (
      <div className="app-shell dashboard-shell">
        <Topbar activeView="alerts" onNavigate={onNavigate} />
        <div className="alx-layout">
          <div className="reports-error-panel" role="alert">
            <div className="reports-error-panel-head">
              <strong>Problème</strong>
              <p>{loadError}</p>
            </div>
            <button
              type="button"
              className="reports-btn reports-btn--primary"
              onClick={() => window.location.reload()}
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell dashboard-shell">
      <Topbar activeView="alerts" onNavigate={onNavigate} />
      <PageEnter className="alerts-page-enter">
        <main className="alx-layout">
          <AlertsHero counts={counts} />

          {message && <div className="reports-success" role="status">{message}</div>}

          {loadError && alertsRaw.length > 0 && (
            <div className="reports-error-panel" role="alert">
              <div className="reports-error-panel-head">
                <strong>Problème</strong>
                <p>{loadError}</p>
              </div>
            </div>
          )}

          <AlertsTabs
            items={navItems}
            value={panel}
            onChange={(next) => {
              setMessage('')
              setFocusAlertId('')
              setPanel(next)
            }}
          />

          <SeverityTiles
            counts={panel === 'history' ? historyCounts : counts}
            value={priority}
            onChange={setPriority}
          />

          {panel === 'history' && (
            <PeriodChips value={period} onChange={setPeriod} />
          )}

          <section className="alx-list" aria-label={panel === 'history' ? 'Historique des alertes' : 'Alertes à traiter'}>
            {visible.length ? visible.map((alert, index) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                panel={panel}
                isAdmin={isAdmin}
                isFocused={focusAlertId && String(focusAlertId) === String(alert.id)}
                delay={Math.min(index * 45, 300)}
                onOpen={() => openAlert(alert)}
                onTreat={() => {
                  setMessage('')
                  setPendingTreat(alert)
                }}
              />
            )) : (
              <EmptyState panel={panel} />
            )}
          </section>
        </main>
      </PageEnter>

      {pendingTreat && (
        <TreatAlertModal
          alert={pendingTreat}
          onClose={() => setPendingTreat(null)}
          onConfirm={confirmTreat}
        />
      )}
    </div>
  )
}

export default AlertsPage
