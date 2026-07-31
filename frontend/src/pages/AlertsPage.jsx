import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, ArrowRight, CheckCircle2, History } from 'lucide-react'
import Topbar from '../components/Topbar.jsx'
import PageEnter from '../components/PageEnter.jsx'
import PageLoader from '../components/PageLoader.jsx'
import SectionWorkspace from '../components/SectionWorkspace.jsx'
import WelcomeBanner from '../components/WelcomeBanner.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { listAlertes, treatAlert } from '../auth.js'
import { requestBadgesRefresh } from '../utils/badges.js'
import {
  PRIORITE_META,
  countAlertsBySeverity,
  filterAlerts,
  normalizePersistedAlert,
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
  const [focusAlertId, setFocusAlertId] = useState(() => new URLSearchParams(window.location.search).get('alertId') || '')
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

  useEffect(() => {
    if (!focusAlertId || loading) return
    const inActive = activeAlerts.some((a) => String(a.id) === String(focusAlertId))
    const inHistory = historyAlerts.some((a) => String(a.id) === String(focusAlertId))
    if (inHistory && !inActive) setPanel('history')
    else if (inActive) setPanel('active')

    const timer = window.setTimeout(() => {
      const el = document.getElementById(`alert-card-${focusAlertId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('is-focused')
        window.setTimeout(() => el.classList.remove('is-focused'), 2200)
      }
    }, 120)
    return () => window.clearTimeout(timer)
  }, [focusAlertId, loading, activeAlerts, historyAlerts])

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
      badge: historyAlerts.length,
    },
  ]), [activeAlerts.length, historyAlerts.length])

  const counts = useMemo(() => countAlertsBySeverity(activeAlerts), [activeAlerts])
  const historyCounts = useMemo(() => countAlertsBySeverity(historyAlerts), [historyAlerts])

  const filterStatus = panel === 'history' ? 'history' : 'active'
  const sourceAlerts = panel === 'history' ? historyAlerts : activeAlerts
  const visible = useMemo(
    () => filterAlerts(sourceAlerts, {
      priority,
      type: 'all',
      dateRange: 'all',
      status: filterStatus,
    }),
    [sourceAlerts, priority, filterStatus],
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

  const listContent = (
    <>
      {message && <div className="reports-success" role="status">{message}</div>}

      {loadError && (
        <div className="reports-error-panel" role="alert">
          <div className="reports-error-panel-head">
            <strong>Problème</strong>
            <p>{loadError}</p>
          </div>
        </div>
      )}

      <section className="alerts-filters alerts-filters--compact" aria-label="Filtrer par priorité">
        <div className="alerts-priority-strip">
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
      </section>

      <section className="alerts-list-panel alerts-list-panel--bare" aria-label={panel === 'history' ? 'Historique' : 'Alertes actives'}>
        <div className="alert-list alert-list--compact">
          {visible.length ? visible.map((alert) => {
            const severity = alert.severity || 'medium'
            const label = alert.priority || PRIORITE_META[alert.priorite]?.label || 'Moyenne'
            const when = panel === 'history'
              ? formatWhen(alert.date_traitement || alert.detected_at)
              : formatWhen(alert.detected_at)
            const author = alert.traite_par_username || alert.traite_par || null
            const isFocused = focusAlertId && String(focusAlertId) === String(alert.id)
            return (
              <div
                key={alert.id}
                id={`alert-card-${alert.id}`}
                className={`alert-item alert-item--compact alert-${severity}${panel === 'history' ? ' alert-item--treated' : ''}${isFocused ? ' is-focused' : ''}`}
                data-severity={severity}
              >
                <div className="alert-severity-bar" aria-hidden="true" />
                <div className="alert-header alert-header--compact">
                  <div className="alert-title-wrap alert-title-wrap--compact">
                    <strong>{alert.title}</strong>
                  </div>
                  <span className={`alert-level-tag alert-level-tag--${severity}`}>{label}</span>
                </div>
                <div className="alert-body alert-body--compact">
                  {alert.subtitle ? (
                    <p className="alert-detail">
                      <AlertSubtitle subtitle={alert.subtitle} />
                    </p>
                  ) : null}
                  {panel === 'history' && alert.justification ? (
                    <p className="alert-justification">
                      <span className="alert-justification-label">Justification</span>
                      {alert.justification}
                    </p>
                  ) : null}
                  <div className="alert-meta-row">
                    <span className="alert-when">
                      {panel === 'history' ? `Traité le ${when}` : when}
                      {panel === 'history' && author ? ` · ${author}` : ''}
                    </span>
                    <div className="alert-item-actions">
                      <button
                        type="button"
                        className="alert-more-btn"
                        onClick={() => openAlert(alert)}
                      >
                        Voir <ArrowRight size={14} aria-hidden="true" />
                      </button>
                      {isAdmin && panel === 'active' && (
                        <button
                          type="button"
                          className="reports-btn reports-btn--primary alert-treat-btn"
                          onClick={() => { setMessage(''); setPendingTreat(alert) }}
                        >
                          <CheckCircle2 size={14} aria-hidden="true" />
                          Traiter
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
    </>
  )

  if (loading) {
    return (
      <div className="app-shell app-shell--alerts dashboard-shell">
        <Topbar activeView="alerts" onNavigate={onNavigate} />
        <PageLoader label="Chargement des alertes…" />
      </div>
    )
  }

  if (loadError && !alertsRaw.length) {
    return (
      <div className="app-shell app-shell--alerts dashboard-shell">
        <Topbar activeView="alerts" onNavigate={onNavigate} />
        <div className="loading-state" style={{ marginTop: 24 }}>
          {loadError}
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell app-shell--alerts dashboard-shell">
      <Topbar activeView="alerts" onNavigate={onNavigate} />
      <PageEnter className="alerts-page-enter">
        <main className="alerts-page alerts-page--workspace">
          <WelcomeBanner
            kicker="Priorités métier"
            title="Centre d’alertes"
            subtitle={
              isAdmin
                ? 'Filtrez, traitez et suivez les alertes actives.'
                : 'Consultez les alertes actives et l’historique.'
            }
          />
          <SectionWorkspace
            className="section-workspace--fill section-workspace--alerts"
            title="Alertes"
            items={navItems}
            activeId={panel}
            hideItemDescriptions
            onChange={(id) => {
              setMessage('')
              setFocusAlertId('')
              setPanel(id)
            }}
          >
            {listContent}
          </SectionWorkspace>
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
