import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, CheckCircle2, History } from 'lucide-react'
import Topbar from '../components/Topbar.jsx'
import PageEnter from '../components/PageEnter.jsx'
import PageLoader from '../components/PageLoader.jsx'
import WelcomeBanner from '../components/WelcomeBanner.jsx'
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

const REASON_PRESETS = [
  { id: 'resolved-on-site', label: 'Résolu sur site', text: 'Résolu directement sur site par l’équipe terrain.' },
  { id: 'false-positive', label: 'Faux positif', text: 'Faux positif détecté à la vérification — aucune action requise.' },
  { id: 'followup', label: 'Suivi en cours', text: 'Suivi en cours — alerte transmise à l’équipe responsable pour traitement.' },
]
const MIN_JUSTIF = 20
const MAX_JUSTIF = 280

function KpiStrip({ counts }) {
  const tiles = [
    { tone: 'critical', label: 'Critiques', value: counts.critique || 0 },
    { tone: 'high', label: 'Hautes', value: counts.haute || 0 },
    { tone: 'medium', label: 'Moyennes', value: counts.moyenne || 0 },
    { tone: 'low', label: 'Basses', value: counts.basse || 0 },
  ]
  return (
    <div className="cf-kpi-strip" aria-label="Récapitulatif par sévérité">
      {tiles.map((t) => (
        <div key={t.tone} className={`cf-kpi-tile cf-kpi-tile--${t.tone}`}>
          <div className="cf-kpi-tile-copy">
            <span className="cf-kpi-tile-label">{t.label}</span>
            <span className="cf-kpi-tile-value">{t.value}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function PeriodChips({ value, onChange }) {
  const opts = [
    { id: '7d', label: '7 jours' },
    { id: '30d', label: '30 jours' },
    { id: '90d', label: '90 jours' },
    { id: 'all', label: 'Tout' },
  ]
  return (
    <div className="cf-period-chips" role="group" aria-label="Filtrer par période">
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          className={`cf-period-chip${value === o.id ? ' is-active' : ''}`}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function filterByPeriod(rows, period) {
  if (period === 'all' || !period) return rows
  const days = { '7d': 7, '30d': 30, '90d': 90 }[period]
  if (!days) return rows
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return rows.filter((r) => {
    const stamp = r.date_traitement || r.detected_at
    if (!stamp) return false
    const t = new Date(stamp).getTime()
    return Number.isFinite(t) && t >= cutoff
  })
}

function TreatAlertModal({ alert, onClose, onConfirm, title }) {
  const [justification, setJustification] = useState('')
  const [reasonId, setReasonId] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const applyReason = (preset) => {
    setReasonId(preset.id)
    setJustification(preset.text)
  }

  const len = justification.trim().length
  const tooShort = len > 0 && len < MIN_JUSTIF

  const submit = async (e) => {
    e.preventDefault()
    const text = justification.trim()
    if (text.length < MIN_JUSTIF) {
      setError(`Justification trop courte (${MIN_JUSTIF} caractères minimum).`)
      return
    }
    if (text.length > MAX_JUSTIF) {
      setError(`Justification trop longue (${MAX_JUSTIF} caractères maximum).`)
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
            <span>Justification du traitement</span>
            <textarea
              value={justification}
              onChange={(e) => { setJustification(e.target.value); setReasonId('') }}
              rows={5}
              placeholder={`Expliquez en ${MIN_JUSTIF} caractères minimum pourquoi cette alerte est traitée…`}
              required
              autoFocus
            />
            <span className={`cf-reason-counter${tooShort ? ' is-error' : ''}`}>
              {len}/{MAX_JUSTIF}
            </span>
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
  const [period, setPeriod] = useState('all')
  const [pendingTreat, setPendingTreat] = useState(null)
  const [bulkSelection, setBulkSelection] = useState([])
  const [bulkModal, setBulkModal] = useState(false)

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
    () => alerts.filter((a) => !a.traitee && a.etat !== 'ignoree' && !isIndeterminateAutonomyAlert(a)),
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
    },
  ]), [activeAlerts.length])

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
    setBulkSelection((prev) => prev.filter((id) => id !== alert.id))
    requestBadgesRefresh({ source: 'alerts' })
  }

  const confirmBulkTreat = async (justification) => {
    if (!bulkSelection.length) return
    const targets = visible.filter((a) => bulkSelection.includes(a.id))
    for (const alert of targets) {
      try {
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
      } catch {
        // on continue le lot — chaque échec sera vu dans l’historique comme non traitée
      }
    }
    setBulkModal(false)
    setBulkSelection([])
    setMessage(`${targets.length} alerte${targets.length > 1 ? 's' : ''} marquée${targets.length > 1 ? 's' : ''} comme traitée${targets.length > 1 ? 's' : ''}.`)
    requestBadgesRefresh({ source: 'alerts' })
  }

  const toggleSelection = (id) => {
    setBulkSelection((prev) => (
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    ))
  }

  const kpiForPanel = panel === 'history' ? historyCounts : counts

  const listContent = (
    <div className="alerts-saas-body">
      <KpiStrip counts={kpiForPanel} />

      {message && <div className="reports-success" role="status">{message}</div>}

      {loadError && (
        <div className="reports-error-panel" role="alert">
          <div className="reports-error-panel-head">
            <strong>Problème</strong>
            <p>{loadError}</p>
          </div>
        </div>
      )}

      {isAdmin && panel === 'active' && bulkSelection.length > 0 && (
        <div className="cf-bulk-bar">
          <span>{bulkSelection.length} alerte{bulkSelection.length > 1 ? 's' : ''} sélectionnée{bulkSelection.length > 1 ? 's' : ''}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="reports-btn reports-btn--ghost" onClick={() => setBulkSelection([])}>
              Tout désélectionner
            </button>
            <button type="button" onClick={() => setBulkModal(true)}>
              Résoudre la sélection
            </button>
          </div>
        </div>
      )}

      <section className="alerts-filters alerts-filters--compact" aria-label="Filtrer par priorité">
        <div className="alerts-priority-strip">
          {[
            { id: 'all', label: 'Toutes les alertes', count: panel === 'history' ? historyCounts.total : counts.total, tone: 'all' },
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
        <p className="alerts-strip-helper">
          Cliquez sur une priorité pour filtrer la liste.{' '}
          {panel === 'history' ? 'Période appliquée à droite.' : ''}
        </p>
      </section>

      {panel === 'history' && (
        <PeriodChips value={period} onChange={setPeriod} />
      )}

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
            const isSelected = bulkSelection.includes(alert.id)
            return (
              <div
                key={alert.id}
                id={`alert-card-${alert.id}`}
                role="button"
                tabIndex={0}
                className={`alert-item alert-item--compact alert-item--clickable alert-${severity}${panel === 'history' ? ' alert-item--treated' : ''}${isFocused ? ' is-focused' : ''}`}
                data-severity={severity}
                onClick={() => openAlert(alert)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    openAlert(alert)
                  }
                }}
              >
                {isAdmin && panel === 'active' && (
                  <span
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={0}
                    className={`alert-select-flag${isSelected ? ' is-checked' : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleSelection(alert.id) }}
                    onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.stopPropagation(); e.preventDefault(); toggleSelection(alert.id) } }}
                    aria-label="Sélectionner pour traitement groupé"
                  >
                    {isSelected ? '✓' : ''}
                  </span>
                )}
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
                      {' · '}
                      {alert.target === 'groups' ? 'Ouvrir le groupe' : 'Ouvrir le site'}
                    </span>
                  </div>
                  {isAdmin && panel === 'active' && (
                    <button
                      type="button"
                      className="alert-treat-btn-lg"
                      onClick={(event) => {
                        event.stopPropagation()
                        setMessage('')
                        setPendingTreat(alert)
                      }}
                    >
                      <CheckCircle2 size={18} aria-hidden="true" />
                      Traiter maintenant
                    </button>
                  )}
                </div>
              </div>
            )
          }) : (
            <div className="cf-empty-rich">
              <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="2.5" />
                <path d="M22 32 L29 39 L44 24" stroke="#16a34a" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <h3>
                {panel === 'history'
                  ? 'Aucune alerte dans cette période.'
                  : 'Tout va bien. Aucune alerte à traiter.'}
              </h3>
              <p>
                {panel === 'history'
                  ? 'Changez la période ou réinitialisez le filtre priorité pour voir plus d’historique.'
                  : 'Les alertes apparaîtront ici dès qu’une situation demandera votre attention.'}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
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
        <div className="loading-state alerts-fatal-error" style={{ marginTop: 24 }}>
          <p>{loadError}</p>
          <button
            type="button"
            className="reports-btn reports-btn--primary"
            onClick={() => window.location.reload()}
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell app-shell--alerts dashboard-shell">
      <Topbar activeView="alerts" onNavigate={onNavigate} />
      <PageEnter className="alerts-page-enter">
        <main className="profile-layout profile-layout--saas alerts-layout--saas">
          <WelcomeBanner
            kicker="Priorités métier"
            title="Centre d’alertes"
            subtitle={
              isAdmin
                ? 'Voyez d’un coup d’œil ce qui pose problème. Cliquez « Traiter » quand c’est résolu.'
                : 'Voici les alertes en cours. Cliquez « Ouvrir le site » pour aller à l’origine du problème.'
            }
          />

          <div className="saas-profile-tabs" role="tablist" aria-label="Sections alertes">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={panel === item.id}
                  className={`saas-profile-tab${panel === item.id ? ' is-active' : ''}`}
                  onClick={() => {
                    setMessage('')
                    setFocusAlertId('')
                    setBulkSelection([])
                    setPanel(item.id)
                  }}
                >
                  {Icon ? <Icon size={16} aria-hidden="true" /> : null}
                  {item.label}
                  {item.badge != null && item.badge !== '' && item.badge > 0 ? (
                    <span className="saas-profile-tab-badge">{item.badge}</span>
                  ) : null}
                </button>
              )
            })}
          </div>

          <div className="saas-section-pane saas-section-pane--alerts">
            {listContent}
          </div>
        </main>
      </PageEnter>

      {pendingTreat && (
        <TreatAlertModal
          alert={pendingTreat}
          onClose={() => setPendingTreat(null)}
          onConfirm={confirmTreat}
        />
      )}

      {bulkModal && (
        <TreatAlertModal
          alert={{
            title: `${bulkSelection.length} alerte${bulkSelection.length > 1 ? 's' : ''} à traiter ensemble`,
          }}
          onClose={() => setBulkModal(false)}
          onConfirm={confirmBulkTreat}
          title="Résoudre la sélection"
        />
      )}
    </div>
  )
}

export default AlertsPage
