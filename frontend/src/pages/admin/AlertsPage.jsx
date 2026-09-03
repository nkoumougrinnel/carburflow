import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Bell, CheckCircle2, ChevronDown, Filter, History } from 'lucide-react'
import Topbar from '@/components/Topbar.jsx'
import PageEnter from '@/components/PageEnter.jsx'
import PageLoader from '@/components/PageLoader.jsx'
import { Button } from '@/components/ui/button.jsx'
import { EmptyState } from '@/components/ui/empty-state.jsx'
import Modal from '@/components/ui/modal.jsx'
import { useAuth } from '@/context/AuthContext.jsx'
import { listAlertes, treatAlert } from '@/auth.js'
import { requestBadgesRefresh } from '@/utils/badges.js'
import {
  PRIORITE_META,
  countAlertsBySeverity,
  filterAlerts,
  formatAlertDateTime,
  isIndeterminateAutonomyAlert,
  normalizePersistedAlert,
  splitAlertSubtitle,
} from '@/utils/alerts.js'

/* ——————————————————————————————————————————————————————————
    Utilitaires
   —————————————————————————————————————————————————————————— */

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
  return formatAlertDateTime(value)
}

function formatDetectedLabel(value) {
  const raw = formatAlertDateTime(value)
  if (!raw || raw === '—') return 'Détectée récemment'
  const [day, ...rest] = raw.split(' ')
  const time = rest.join(' ')
  return time ? `Détectée le ${day} à ${time}` : `Détectée le ${day}`
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

/* ——————————————————————————————————————————————————————————
    Composants internes
   —————————————————————————————————————————————————————————— */

/**
 * Bandeau d'en-tête factuel (pas de message marketing)
 */
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

/**
 * Onglets « À traiter » / « Historique »
 */
function AlertsTabs({ items, value, onChange }) {
  return (
    <div className="saas-profile-tabs" role="tablist" aria-label="Sections des alertes">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={value === item.id}
            className={`saas-profile-tab${value === item.id ? ' is-active' : ''}`}
            onClick={() => onChange(item.id)}
          >
            {Icon ? <Icon size={17} aria-hidden="true" /> : null}
            {item.label}
            {item.badge != null && item.badge > 0 ? (
              <span className="saas-profile-tab-badge">{item.badge}</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Filtres de priorité (toutes / critique / haute / moyenne / basse)
 */
function SeverityChips({ counts, value, onChange }) {
  return (
    <div className="saas-profile-tabs" role="group" aria-label="Filtrer par niveau">
      {SEVERITY_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`saas-profile-tab${value === option.id ? ' is-active' : ''}`}
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
        >
          <span className="saas-profile-tab-label">{option.label}</span>
          <span className="saas-profile-tab-badge">{counts?.[option.key] ?? 0}</span>
        </button>
      ))}
    </div>
  )
}

/**
 * Filtres de période pour l'historique
 */
function PeriodChips({ value, onChange }) {
  const options = [
    { id: '7d', label: '7 jours' },
    { id: '30d', label: '30 jours' },
    { id: '90d', label: '90 jours' },
    { id: 'all', label: 'Tout' },
  ]
  return (
    <div className="saas-profile-tabs" role="group" aria-label="Filtrer par période">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`saas-profile-tab${value === option.id ? ' is-active' : ''}`}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Carte d'alerte active ou historique
 */
function AlertCard({ alert, panel, isAdmin, isFocused, onOpen, onTreat, delay = 0 }) {
  const severity = alert.severity || 'medium'
  const label = alert.priority || PRIORITE_META[alert.priorite]?.label || 'Moyenne'
  const when = panel === 'history'
    ? formatWhen(alert.date_traitement || alert.detected_at)
    : formatWhen(alert.detected_at)
  const author = alert.traite_par_username || alert.traite_par || null
  const siteName = alert.site_name || '—'
  const groupLabel = alert.group_label || (alert.group_id ? `G-${alert.group_id}` : null)

  return (
    <article
      id={`alert-card-${alert.id}`}
      className={`alx-card alx-card--${severity}${isFocused ? ' is-focused' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="alx-card-rail" aria-hidden="true" />
      <div className="alx-card-body">
        <header className="alx-card-head">
          {/* Badge sans emoji, uniquement une classe CSS pour la couleur */}
          <span className={`alx-pill alx-pill--${severity}`}>{label}</span>
          <span className="alx-card-head-meta">
            <span className="alx-card-date">{panel === 'history' ? when : formatDetectedLabel(alert.detected_at)}</span>
            {panel === 'history' && (
              <span className="alx-pill alx-pill--treated">✓ Traitée</span>
            )}
          </span>
        </header>

        {/* Titre reformulé (factuel) */}
        <h3>{alert.title}</h3>

        {/* Sous-titre détaillé avec éventuelles flèches */}
        {alert.subtitle ? (
          <p className="alx-card-text">
            <AlertSubtitle subtitle={alert.subtitle} />
          </p>
        ) : null}

        {/* Contexte : Site et Groupe */}
        <div className="alx-card-context">
          Site : <strong>{siteName}</strong>
          {groupLabel ? ` | Groupe : ${groupLabel}` : ''}
        </div>

        {/* Pour l'historique : note de traitement et date de traitement */}
        {panel === 'history' && alert.justification && (
          <div className="alx-card-justif-block">
            <p className="alx-card-justif">
              <strong>Note de traitement</strong>
            </p>
            <p>{alert.justification}</p>
          </div>
        )}

        {panel === 'history' && (
          <p className="alx-card-treated-by">
            Traité le {formatWhen(alert.date_traitement || alert.detected_at)}
            {author ? ` · ${author}` : ''}
          </p>
        )}

        <footer className="alx-card-actions">
          <Button variant="outline" onClick={onOpen}>
            {alert.target === 'groups' ? 'Ouvrir le groupe' : 'Ouvrir le site'}
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
          {isAdmin && panel === 'active' && (
            <Button variant="primary" onClick={onTreat}>
              Traiter
            </Button>
          )}
        </footer>
      </div>
    </article>
  )
}

/**
 * Modal de justification obligatoire
 */
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
    <Modal
      onClose={onClose}
      kicker="Résolution"
      title={title || 'Marquer comme traitée'}
      subtitle={alert.title}
      titleId="alert-treat-title"
      cardClassName="alert-treat-modal"
    >
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
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button variant="primary" type="submit" loading={saving}>
            {saving ? 'Enregistrement…' : 'Confirmer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/* ——————————————————————————————————————————————————————————
    Page principale
   —————————————————————————————————————————————————————————— */

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
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

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

  useEffect(() => {
    setPage(1)
  }, [panel, priority, period, pageSize])

  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const pagedAlerts = visible.slice((safePage - 1) * pageSize, safePage * pageSize)

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
          <EmptyState
            icon={<Bell size={40} />}
            title="Impossible de charger les alertes"
            description={loadError}
            action={{ label: 'Réessayer', onClick: () => window.location.reload() }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell dashboard-shell">
      <Topbar activeView="alerts" onNavigate={onNavigate} />
      <PageEnter className="alerts-page-enter">
        <main className="page-layout mq-alx-page">
          <header className="mq-alx-head">
            <div>
              <h1>Centre d’alertes</h1>
              <p>Suivi et traitement des alertes détectées sur vos sites.</p>
            </div>
            <div className="mq-alx-filters">
              <button
                type="button"
                className="mq-alx-filters-btn"
                aria-expanded={filtersOpen}
                onClick={() => setFiltersOpen((open) => !open)}
              >
                <Filter size={16} aria-hidden="true" />
                Filtres
                <ChevronDown size={16} aria-hidden="true" />
              </button>
              {filtersOpen ? (
                <div className="mq-alx-filters-panel cf-filter-bar" role="dialog" aria-label="Filtres des alertes">
                  <div className="cf-filter-field">
                    <span className="cf-filter-label">Statut</span>
                    <AlertsTabs
                      items={navItems}
                      value={panel}
                      onChange={(id) => {
                        setMessage('')
                        setFocusAlertId('')
                        setPanel(id)
                      }}
                    />
                  </div>
                  <div className="cf-filter-field">
                    <span className="cf-filter-label">Niveau</span>
                    <SeverityChips
                      counts={panel === 'history' ? historyCounts : counts}
                      value={priority}
                      onChange={setPriority}
                    />
                  </div>
                  {panel === 'history' ? (
                    <div className="cf-filter-field">
                      <span className="cf-filter-label">Période</span>
                      <PeriodChips value={period} onChange={setPeriod} />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </header>

          {message && <div className="reports-success" role="status">{message}</div>}

          {loadError && alertsRaw.length > 0 && (
            <div className="reports-error-panel" role="alert">
              <div className="reports-error-panel-head">
                <strong>Problème</strong>
                <p>{loadError}</p>
              </div>
            </div>
          )}

          <section className="alx-list mq-alx-grid" aria-label={panel === 'history' ? 'Historique des alertes' : 'Alertes à traiter'}>
            {pagedAlerts.length ? pagedAlerts.map((alert, index) => (
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
              <EmptyState
                icon={panel === 'history' ? <History size={30} /> : <CheckCircle2 size={30} />}
                title={panel === 'history' ? "Aucune alerte dans cette période." : "Rien à signaler, tout va bien."}
                description={panel === 'history'
                  ? "Changez la période ou le niveau pour retrouver plus d’historique."
                  : "Les alertes apparaîtront ici dès qu’une situation demandera votre attention."}
              />
            )}
          </section>

          {visible.length > 0 ? (
            <nav className="mq-alx-pager" aria-label="Pagination des alertes">
              <button
                type="button"
                className="mq-alx-pager-btn"
                disabled={safePage <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Précédent
              </button>
              <span className="mq-alx-pager-status">{safePage} / {pageCount}</span>
              <button
                type="button"
                className="mq-alx-pager-btn"
                disabled={safePage >= pageCount}
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              >
                Suivant →
              </button>
              <label className="mq-alx-pager-size">
                <span className="sr-only">Alertes par page</span>
                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                >
                  <option value={10}>10 par page</option>
                  <option value={20}>20 par page</option>
                </select>
              </label>
            </nav>
          ) : null}
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