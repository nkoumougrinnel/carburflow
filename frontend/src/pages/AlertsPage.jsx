import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, Filter, ArrowRight, CheckCircle2, History, RotateCcw } from 'lucide-react'
import Topbar from '../components/Topbar.jsx'
import WelcomeBanner from '../components/WelcomeBanner.jsx'
import PageEnter from '../components/PageEnter.jsx'
import PageLoader from '../components/PageLoader.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { listAlertes, treatAlert } from '../auth.js'
import {
  ALERT_TYPE_META,
  PRIORITE_META,
  countAlertsBySeverity,
  filterAlerts,
  normalizePersistedAlert,
  splitAlertSubtitle,
} from '../utils/alerts.js'

const TYPE_OPTIONS = [
  'autonomie_critique',
  'autonomie_preventive',
  'conso_sans_horaire',
  'ecart_conso',
]

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

function TreatAlertModal({ alert, onClose, onConfirm }) {
  const [justification, setJustification] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    const text = justification.trim()
    if (text.length < 5) {
      setError('Indiquez une justification d’au moins 5 caractères.')
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
    <div
      className="rapport-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="rapport-modal alert-treat-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="alert-treat-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rapport-modal-head">
          <div>
            <p className="rapport-modal-kicker">Validation admin</p>
            <h2 id="alert-treat-title">Marquer comme traitée</h2>
            <p>{alert.title}</p>
          </div>
          <button type="button" className="rapport-modal-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>

        <form className="rapport-modal-form" onSubmit={submit}>
          <label className="alert-treat-field">
            <span>Justification du traitement</span>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={5}
              placeholder="Expliquez pourquoi cette alerte est considérée comme traitée…"
              required
              minLength={5}
              autoFocus
            />
          </label>
          {error && <p className="alert-treat-error" role="alert">{error}</p>}
          <div className="rapport-modal-actions">
            <button type="button" className="reports-btn reports-btn--ghost" onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <button type="submit" className="reports-btn reports-btn--primary" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Confirmer le traitement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

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
  const [type, setType] = useState(() => new URLSearchParams(window.location.search).get('type') || 'all')
  const [dateRange, setDateRange] = useState(() => new URLSearchParams(window.location.search).get('date') || 'all')
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
    if (type !== 'all') params.set('type', type)
    if (dateRange !== 'all') params.set('date', dateRange)
    const qs = params.toString()
    window.history.replaceState({}, '', qs ? `/alertes/?${qs}` : '/alertes/')
  }, [panel, priority, type, dateRange])

  const alerts = useMemo(
    () => (alertsRaw || []).map(normalizePersistedAlert).filter(Boolean),
    [alertsRaw],
  )

  const activeAlerts = useMemo(
    () => alerts.filter((a) => !a.traitee && a.etat !== 'ignoree'),
    [alerts],
  )
  const historyAlerts = useMemo(
    () => alerts
      .filter((a) => a.traitee || a.etat === 'ignoree' || a.etat === 'traitee')
      .sort((a, b) => {
        const ta = new Date(a.date_traitement || a.detected_at || 0).getTime()
        const tb = new Date(b.date_traitement || b.detected_at || 0).getTime()
        return tb - ta
      }),
    [alerts],
  )

  const counts = useMemo(() => countAlertsBySeverity(activeAlerts), [activeAlerts])
  const historyCounts = useMemo(() => countAlertsBySeverity(historyAlerts), [historyAlerts])

  const filterStatus = panel === 'history' ? 'history' : 'active'
  const sourceAlerts = panel === 'history' ? historyAlerts : activeAlerts
  const visible = useMemo(
    () => filterAlerts(sourceAlerts, {
      priority,
      type,
      dateRange,
      status: filterStatus,
    }),
    [sourceAlerts, priority, type, dateRange, filterStatus],
  )

  const filtersActive = priority !== 'all' || type !== 'all' || dateRange !== 'all'

  const resetFilters = () => {
    setPriority('all')
    setType('all')
    setDateRange('all')
  }

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
    setPanel('history')
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
        <div className="loading-state" style={{ marginTop: 24 }}>
          {loadError}
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell dashboard-shell">
      <Topbar activeView="alerts" onNavigate={onNavigate} />
      <PageEnter>
        <main className="alerts-page">
          <WelcomeBanner
            title="Centre d’alertes"
            subtitle={
              isAdmin
                ? 'Traitez les alertes actives, puis consultez l’historique des validations.'
                : 'Consultez les alertes actives et l’historique des traitements.'
            }
          />

          {message && <div className="reports-success" role="status">{message}</div>}

          {loadError && (
            <div className="reports-error-panel" role="alert">
              <div className="reports-error-panel-head">
                <strong>Problème</strong>
                <p>{loadError}</p>
              </div>
            </div>
          )}

          <div className="alerts-tabs" role="tablist" aria-label="Sections alertes">
            <button
              type="button"
              role="tab"
              aria-selected={panel === 'active'}
              className={`alerts-tab${panel === 'active' ? ' is-active' : ''}`}
              onClick={() => setPanel('active')}
            >
              <Bell size={16} aria-hidden="true" />
              À traiter
              <span className="alerts-tab-count">{activeAlerts.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={panel === 'history'}
              className={`alerts-tab${panel === 'history' ? ' is-active' : ''}`}
              onClick={() => setPanel('history')}
            >
              <History size={16} aria-hidden="true" />
              Historique
              <span className="alerts-tab-count">{historyAlerts.length}</span>
            </button>
          </div>

          <section className="alerts-filters metric-panel">
            <div className="alerts-filters-head">
              <div className="alerts-filters-title">
                <Filter size={18} aria-hidden="true" />
                <h2>Filtres</h2>
              </div>
              {filtersActive && (
                <button type="button" className="alerts-reset" onClick={resetFilters}>
                  <RotateCcw size={14} aria-hidden="true" />
                  Réinitialiser
                </button>
              )}
            </div>

            <div className="alerts-priority-strip" aria-label="Filtrer par priorité">
              {[
                { id: 'all', label: 'Toutes', count: panel === 'history' ? historyCounts.total : counts.total, tone: 'all' },
                { id: 'critique', label: 'Critique', count: panel === 'history' ? historyCounts.critique : counts.critique, tone: 'critical' },
                { id: 'haute', label: 'Haute', count: panel === 'history' ? historyCounts.haute : counts.haute, tone: 'high' },
                { id: 'moyenne', label: 'Moyenne', count: panel === 'history' ? historyCounts.moyenne : counts.moyenne, tone: 'medium' },
                { id: 'basse', label: 'Basse', count: panel === 'history' ? historyCounts.basse : counts.basse, tone: 'low' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`alerts-priority-card alerts-priority-card--${item.tone}${priority === item.id ? ' is-active' : ''}`}
                  onClick={() => setPriority(item.id)}
                >
                  <span className="alerts-priority-label">{item.label}</span>
                  <strong className="alerts-priority-count">{item.count}</strong>
                </button>
              ))}
            </div>

            <div className="alerts-filters-grid">
              <label className="alerts-filter-field">
                <span>Type d’alerte</span>
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="all">Tous les types</option>
                  {TYPE_OPTIONS.map((key) => (
                    <option key={key} value={key}>{ALERT_TYPE_META[key].label}</option>
                  ))}
                </select>
              </label>
              <label className="alerts-filter-field">
                <span>{panel === 'history' ? 'Date de traitement' : 'Date de détection'}</span>
                <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
                  <option value="all">Toutes les dates</option>
                  <option value="today">Aujourd’hui</option>
                  <option value="week">7 derniers jours</option>
                  <option value="month">30 derniers jours</option>
                </select>
              </label>
              <div className="alerts-filter-field alerts-filter-field--meta">
                <span>Résultat</span>
                <p className="alerts-filters-meta">
                  {visible.length} alerte{visible.length > 1 ? 's' : ''}
                  {panel === 'history' ? ' dans l’historique' : ' à traiter'}
                </p>
              </div>
            </div>
          </section>

          <section className="dashboard-alerts metric-panel alerts-list-panel">
            <div className="metric-title-row alert-section-head">
              <div>
                <span className="metric-label">{panel === 'history' ? 'Historique' : 'Actives'}</span>
                <h3>
                  {panel === 'history' ? 'Alertes traitées' : 'Alertes à traiter'}
                </h3>
              </div>
              <button type="button" className="dashboard-section-link" onClick={() => onNavigate('dashboard')}>
                Retour dashboard →
              </button>
            </div>

            <div className="alert-list">
              {visible.length ? visible.map((alert) => {
                const severity = alert.severity || 'medium'
                const label = alert.priority || PRIORITE_META[alert.priorite]?.label || 'Moyenne'
                const typeLabel = ALERT_TYPE_META[alert.type]?.label || alert.type
                const when = panel === 'history'
                  ? formatWhen(alert.date_traitement || alert.detected_at)
                  : formatWhen(alert.detected_at)
                const author = alert.traite_par_username || alert.traite_par || null
                return (
                  <div
                    key={alert.id}
                    className={`alert-item alert-${severity}${panel === 'history' ? ' alert-item--treated' : ''}`}
                    data-severity={severity}
                  >
                    <div className="alert-severity-bar" aria-hidden="true" />
                    <div className="alert-header">
                      <div className="alert-title-wrap">
                        <span className="alert-type-chip">{typeLabel}</span>
                        {panel === 'history' && (
                          <span className={`alert-type-chip ${alert.etat === 'ignoree' ? 'alert-type-chip--ignored' : 'alert-type-chip--treated'}`}>
                            {alert.etat === 'ignoree' ? 'Ignorée' : 'Traitée'}
                          </span>
                        )}
                        <strong>{alert.title}</strong>
                      </div>
                      <span className={`alert-level-tag alert-level-tag--${severity}`}>{label}</span>
                    </div>
                    <div className="alert-body">
                      <AlertSubtitle subtitle={alert.subtitle} />
                      {panel === 'history' && alert.justification && (
                        <p className="alert-justification">
                          <strong>Justification :</strong> {alert.justification}
                          {author ? ` — ${author}` : ''}
                        </p>
                      )}
                      <div className="alert-meta-row">
                        <span>
                          {panel === 'history' ? `Traité le ${when}` : `Détectée le ${when}`}
                          {panel === 'history' && author ? ` · ${author}` : ''}
                        </span>
                        <div className="alert-item-actions">
                          <button
                            type="button"
                            className="alert-more-btn"
                            onClick={() => openAlert(alert)}
                          >
                            En savoir plus <ArrowRight size={14} aria-hidden="true" />
                          </button>
                          {isAdmin && panel === 'active' && (
                            <button
                              type="button"
                              className="reports-btn reports-btn--primary alert-treat-btn"
                              onClick={() => { setMessage(''); setPendingTreat(alert) }}
                            >
                              <CheckCircle2 size={15} aria-hidden="true" />
                              Marquer traitée
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }) : (
                <div className="alert-empty">
                  {panel === 'history'
                    ? (historyAlerts.length
                      ? 'Aucune alerte pour ces filtres dans l’historique.'
                      : 'Aucune alerte traitée pour le moment.')
                    : (activeAlerts.length
                      ? 'Aucune alerte pour ces filtres.'
                      : 'Aucune alerte à traiter pour le moment.')}
                </div>
              )}
            </div>
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
