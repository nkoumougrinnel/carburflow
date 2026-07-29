import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, Filter, ArrowRight, CheckCircle2 } from 'lucide-react'
import Topbar from '../components/Topbar.jsx'
import WelcomeBanner from '../components/WelcomeBanner.jsx'
import PageEnter from '../components/PageEnter.jsx'
import PageLoader from '../components/PageLoader.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { apiFetch, listAlertTreatments, treatAlert } from '../auth.js'
import {
  ALERT_TYPE_META,
  SEVERITY_META,
  buildDashboardAlerts,
  countAlertsBySeverity,
  filterAlerts,
  mergeAlertTreatments,
  splitAlertSubtitle,
} from '../utils/alerts.js'

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
  const [dashboardData, setDashboardData] = useState(null)
  const [treatments, setTreatments] = useState([])
  const [loadError, setLoadError] = useState('')
  const [message, setMessage] = useState('')
  const [priority, setPriority] = useState(() => new URLSearchParams(window.location.search).get('priority') || 'all')
  const [type, setType] = useState(() => new URLSearchParams(window.location.search).get('type') || 'all')
  const [dateRange, setDateRange] = useState(() => new URLSearchParams(window.location.search).get('date') || 'all')
  const [status, setStatus] = useState(() => new URLSearchParams(window.location.search).get('status') || 'active')
  const [pendingTreat, setPendingTreat] = useState(null)

  const loadAll = useCallback(async () => {
    const [overview, treated] = await Promise.all([
      apiFetch('/api/v1/dashboard/overview'),
      listAlertTreatments().catch(() => []),
    ])
    setDashboardData(overview)
    setTreatments(Array.isArray(treated) ? treated : [])
    setLoadError('')
  }, [])

  useEffect(() => {
    let cancelled = false
    loadAll().catch((err) => {
      if (!cancelled) setLoadError(err.message || 'Impossible de charger les alertes.')
    })
    return () => { cancelled = true }
  }, [loadAll])

  useEffect(() => {
    const params = new URLSearchParams()
    if (priority !== 'all') params.set('priority', priority)
    if (type !== 'all') params.set('type', type)
    if (dateRange !== 'all') params.set('date', dateRange)
    if (status !== 'active') params.set('status', status)
    const qs = params.toString()
    window.history.replaceState({}, '', qs ? `/alertes/?${qs}` : '/alertes/')
  }, [priority, type, dateRange, status])

  const siteRows = useMemo(() => {
    if (!dashboardData?.sites?.length) return []
    return dashboardData.sites.map((site) => ({
      ...site,
      autonomie_hours: site.autonomie_hours != null ? Number(site.autonomie_hours) : null,
      formatted_autonomy: site.formatted_autonomy || null,
      is_infinite_consumption: !!site.is_infinite_consumption,
      is_infinite_autonomy: !!site.is_infinite_autonomy,
      avg_consumption: site.avg_consumption != null ? Number(site.avg_consumption) : 0,
      latest_volume: site.latest_volume != null ? Number(site.latest_volume) : 0,
    }))
  }, [dashboardData])

  const groupRows = useMemo(() => {
    if (!dashboardData?.groups?.length) return []
    return dashboardData.groups.map((group) => ({
      ...group,
      latest_consumption: group.latest_consumption != null ? Number(group.latest_consumption) : 0,
      mean_hourly_consumption_deduite: group.mean_hourly_consumption_deduite != null ? Number(group.mean_hourly_consumption_deduite) : 0,
      latest_hourly_consumption: group.latest_hourly_consumption != null ? Number(group.latest_hourly_consumption) : null,
      latest_hours: group.latest_hours != null ? Number(group.latest_hours) : 0,
    }))
  }, [dashboardData])

  const alerts = useMemo(() => {
    const computed = buildDashboardAlerts(siteRows, groupRows)
    return mergeAlertTreatments(computed, treatments)
  }, [siteRows, groupRows, treatments])

  const activeAlerts = useMemo(() => alerts.filter((a) => !a.traitee), [alerts])
  const counts = useMemo(() => countAlertsBySeverity(activeAlerts), [activeAlerts])
  const visible = useMemo(
    () => filterAlerts(alerts, { priority, type, dateRange, status }),
    [alerts, priority, type, dateRange, status],
  )

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
    setTreatments((prev) => {
      const next = prev.filter((t) => t.cle !== alert.id)
      if (saved) next.unshift(saved)
      return next
    })
    setPendingTreat(null)
    setMessage('Alerte marquée comme traitée.')
    setStatus('treated')
  }

  if (!dashboardData && !loadError) {
    return (
      <div className="app-shell dashboard-shell">
        <Topbar activeView="alerts" onNavigate={onNavigate} />
        <PageLoader label="Chargement des alertes…" />
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
                ? 'Filtrez, ouvrez un site/groupe, et validez le traitement avec une justification.'
                : 'Filtrez par priorité, type et date. Cliquez une alerte pour ouvrir le site ou le groupe.'
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

          <section className="alerts-priority-strip" aria-label="Compteurs par priorité">
            {[
              { id: 'all', label: 'Toutes', count: counts.total, tone: 'all' },
              { id: 'critical', label: 'Urgent', count: counts.critical, tone: 'critical' },
              { id: 'medium', label: 'À surveiller', count: counts.medium, tone: 'medium' },
              { id: 'low', label: 'Attention', count: counts.low, tone: 'low' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                className={`alerts-priority-card alerts-priority-card--${item.tone}${priority === item.id ? ' is-active' : ''}`}
                onClick={() => { setPriority(item.id); setStatus('active') }}
              >
                <span className="alerts-priority-label">{item.label}</span>
                <strong className="alerts-priority-count">{item.count}</strong>
              </button>
            ))}
          </section>

          <section className="alerts-filters metric-panel">
            <div className="alerts-filters-head">
              <Filter size={18} aria-hidden="true" />
              <h2>Filtres</h2>
            </div>
            <div className="alerts-filters-grid">
              <label className="alerts-filter-field">
                <span>Statut</span>
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="active">À traiter</option>
                  <option value="treated">Traitées</option>
                  <option value="all">Toutes</option>
                </select>
              </label>
              <label className="alerts-filter-field">
                <span>Priorité</span>
                <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="all">Toutes</option>
                  <option value="critical">Urgent</option>
                  <option value="medium">À surveiller</option>
                  <option value="low">Attention</option>
                </select>
              </label>
              <label className="alerts-filter-field">
                <span>Type</span>
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="all">Tous les types</option>
                  {Object.entries(ALERT_TYPE_META).map(([key, meta]) => (
                    <option key={key} value={key}>{meta.label}</option>
                  ))}
                </select>
              </label>
              <label className="alerts-filter-field">
                <span>Date</span>
                <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
                  <option value="all">Toutes les dates</option>
                  <option value="today">Aujourd’hui</option>
                  <option value="week">7 derniers jours</option>
                  <option value="month">30 derniers jours</option>
                </select>
              </label>
            </div>
            <p className="alerts-filters-meta">
              {visible.length} alerte{visible.length > 1 ? 's' : ''} affichée{visible.length > 1 ? 's' : ''}
              {(priority !== 'all' || type !== 'all' || dateRange !== 'all' || status !== 'active') && (
                <button
                  type="button"
                  className="alerts-reset"
                  onClick={() => {
                    setPriority('all')
                    setType('all')
                    setDateRange('all')
                    setStatus('active')
                  }}
                >
                  Réinitialiser
                </button>
              )}
            </p>
          </section>

          <section className="dashboard-alerts metric-panel alerts-list-panel">
            <div className="metric-title-row alert-section-head">
              <div>
                <span className="metric-label">Liste</span>
                <h3>
                  <Bell size={18} aria-hidden="true" style={{ marginRight: 8, verticalAlign: -3 }} />
                  Alertes filtrées
                </h3>
              </div>
              <button type="button" className="dashboard-section-link" onClick={() => onNavigate('dashboard')}>
                Retour dashboard →
              </button>
            </div>

            <div className="alert-list">
              {visible.length ? visible.map((alert) => {
                const severity = alert.severity || 'medium'
                const label = alert.priority || SEVERITY_META[severity]?.label || 'Moyen'
                const typeLabel = ALERT_TYPE_META[alert.type]?.label || alert.type
                const when = alert.detected_at
                  ? new Date(alert.detected_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
                  : '—'
                return (
                  <div
                    key={alert.id}
                    className={`alert-item alert-${severity}${alert.traitee ? ' alert-item--treated' : ''}`}
                    data-severity={severity}
                  >
                    <div className="alert-priority-bar" aria-hidden="true" />
                    <div className="alert-header">
                      <div className="alert-title-wrap">
                        <span className={`alert-level-tag alert-level-tag--${severity}`}>{label}</span>
                        <span className="alert-type-chip">{typeLabel}</span>
                        {alert.traitee && <span className="alert-type-chip alert-type-chip--treated">Traitée</span>}
                        <strong>{alert.title}</strong>
                      </div>
                      <span className={`alert-badge alert-badge-${severity}`}>
                        <span className="alert-badge-text">{label}</span>
                      </span>
                    </div>
                    <div className="alert-body">
                      {alert.is_infinite_consumption && (
                        <span className="alert-anomaly-prefix">Anomalie :</span>
                      )}
                      <AlertSubtitle subtitle={alert.subtitle} />
                      {alert.traitee && alert.justification && (
                        <p className="alert-justification">
                          <strong>Justification :</strong> {alert.justification}
                          {alert.traite_par ? ` — ${alert.traite_par}` : ''}
                        </p>
                      )}
                      <div className="alert-meta-row">
                        <span>{when}</span>
                        <div className="alert-item-actions">
                          <button
                            type="button"
                            className="alert-more-btn"
                            onClick={() => openAlert(alert)}
                          >
                            En savoir plus <ArrowRight size={14} aria-hidden="true" />
                          </button>
                          {isAdmin && !alert.traitee && (
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
                  {alerts.length
                    ? 'Aucune alerte pour ces filtres.'
                    : 'Aucune alerte majeure détectée pour le moment.'}
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
