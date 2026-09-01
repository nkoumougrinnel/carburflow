import React, { useEffect, useMemo, useState } from 'react'
import { CircleAlert } from 'lucide-react'
import Topbar from '@/components/Topbar.jsx'
import WelcomeBanner from '@/components/WelcomeBanner.jsx'
import Button from '@/components/ui/button.jsx'
import { EmptyState } from '@/components/ui/empty-state.jsx'
import { apiFetch } from '@/auth.js'
import AutonomyBadge from '@/components/AutonomyBadge.jsx'
import PageLoader from '@/components/PageLoader.jsx'
import PageEnter from '@/components/PageEnter.jsx'
import { getAutonomySeverity } from '@/utils/format.js'
import { ecartArrow, ecartClass, ecartTitle } from '@/utils/ecart.js'
import {
  countAlertsBySeverity,
  isIndeterminateAutonomyAlert,
  normalizePersistedAlert,
  pickPreviewAlerts,
  resolvePrioriteKey,
} from '@/utils/alerts.js'

function DashboardPage({ onNavigate }) {
  const [dashboardData, setDashboardData] = useState(null)
  const [loadError, setLoadError] = useState('')

  const formatValue = (value, suffix = '') => {
    if (value == null || Number.isNaN(value)) return '—'
    return `${Number(value).toLocaleString('fr-FR')}${suffix}`
  }

  const average = (values = []) => {
    const numeric = (values || []).filter((value) => typeof value === 'number' && !Number.isNaN(value))
    if (!numeric.length) return 0
    return numeric.reduce((sum, value) => sum + value, 0) / numeric.length
  }

  // Écart (Semaine N vs Semaine N-1) / Semaine N-1
  // Hausse de consommation (N > N-1) = rouge (mauvais)
  // Baisse de consommation (N < N-1) = vert (bon)
  const renderEcartVsN1 = (latest, previous, fallback = '—', invert = false) => {
    if (latest == null || previous == null || previous === 0) {
      return <span title={ecartTitle(null)}>{fallback}</span>
    }
    const gapPct = Number((((latest - previous) / previous) * 100).toFixed(1))
    const tone = ecartClass(gapPct, { invert })
    const arrow = ecartArrow(gapPct)
    return (
      <span className={`deviation-cell ${tone}`.trim()} title={ecartTitle(gapPct)}>
        {arrow ? `${arrow} ` : ''}{Math.abs(gapPct).toFixed(1)}%
      </span>
    )
  }

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoadError('')
        const payload = await apiFetch('/api/dashboard/overview')
        setDashboardData(payload)
      } catch (error) {
        console.warn('Dashboard API unavailable.', error)
        setDashboardData(null)
        setLoadError(error.message || 'Impossible de charger le tableau de bord.')
      }
    }

    loadDashboardData()
  }, [])

  const goSites = (site = {}) => {
    const siteId = site.id ?? site.site_id
    onNavigate?.({
      view: 'sites',
      siteId,
      siteName: site.site_name || site.label || site.nom_site,
      mode: site.mode || (siteId ? 'details' : 'all'),
    })
  }

  const goGroups = (group = {}) => {
    const groupId = group.id ?? group.group_id
    onNavigate?.({
      view: 'groups',
      groupId,
      groupLabel: group.label || group.group_label,
      mode: group.mode || (groupId ? 'details' : 'all'),
    })
  }

  const siteRows = useMemo(() => {
    if (!dashboardData?.sites?.length) return []
    return [...dashboardData.sites].map((site) => ({
      ...site,
      autonomy: site.autonomy != null ? Number(site.autonomy) : null,
      autonomie_hours: site.autonomie_hours != null ? Number(site.autonomie_hours) : null,
      formatted_autonomy: site.formatted_autonomy || null,
      is_infinite_consumption: !!site.is_infinite_consumption,
      is_infinite_autonomy: !!site.is_infinite_autonomy,
      is_sans_fonctionnement: !!site.is_sans_fonctionnement,
      avg_consumption: site.avg_consumption != null ? Number(site.avg_consumption) : 0,
      latest_consumption: site.latest_consumption != null ? Number(site.latest_consumption) : 0,
      previous_consumption: site.previous_consumption != null ? Number(site.previous_consumption) : null,
      consumption_stddev: site.consumption_stddev != null ? Number(site.consumption_stddev) : null,
      latest_volume: site.latest_volume != null ? Number(site.latest_volume) : 0,
    }))
  }, [dashboardData])

  // Dans le useMemo groupRows
  const groupRows = useMemo(() => {
    if (!dashboardData?.groups?.length) return []
    return [...dashboardData.groups].map((group) => ({
      ...group,
      avg_consumption: group.avg_consumption != null ? Number(group.avg_consumption) : 0,
      latest_consumption: group.latest_consumption != null ? Number(group.latest_consumption) : 0,
      previous_consumption: group.previous_consumption != null ? Number(group.previous_consumption) : null,
      // === CHAMPS CORRIGÉS ===
      mean_hourly_consumption: group.mean_hourly_consumption != null ? Number(group.mean_hourly_consumption) : 0,
      mean_hourly_consumption_deduite: group.mean_hourly_consumption_deduite != null ? Number(group.mean_hourly_consumption_deduite) : 0,
      latest_hourly_consumption: group.latest_hourly_consumption != null ? Number(group.latest_hourly_consumption) : null,
      previous_hourly_consumption: group.previous_hourly_consumption != null ? Number(group.previous_hourly_consumption) : null,
      avg_hours: group.avg_hours != null ? Number(group.avg_hours) : 0,
      latest_hours: group.latest_hours != null ? Number(group.latest_hours) : 0,
      variance_pct: group.variance_pct != null ? Number(group.variance_pct) : 0,
      autonomy: group.autonomie_hours != null ? Number(group.autonomie_hours) : (group.autonomy != null ? Number(group.autonomy) : null),
      formatted_autonomy: group.formatted_autonomy || null,
      is_abnormal: !!group.is_abnormal,
      is_infinite_consumption: !!group.is_infinite_consumption,
      has_anomaly: !!(group.has_anomaly || group.is_abnormal || group.is_infinite_consumption),
      ecart_pct: group.ecart_pct != null ? Number(group.ecart_pct) : (group.variance_pct != null ? Number(group.variance_pct) : 0),
    }))
  }, [dashboardData])



  const siteAverageAutonomy = useMemo(() => average(siteRows.map((site) => site.autonomy).filter((value) => value != null)), [siteRows])
  const siteAverageAutonomyHours = useMemo(() => average(siteRows.map((site) => site.autonomie_hours).filter((value) => value != null)), [siteRows])
  const siteAverageConsumption = useMemo(() => average(siteRows.map((site) => site.avg_consumption)), [siteRows])
  const groupAverageConsumption = useMemo(() => average(groupRows.map((group) => group.avg_consumption)), [groupRows])
  const groupAverageVariance = useMemo(() => average(groupRows.map((group) => group.variance_pct)), [groupRows])
  const groupAverageAutonomy = useMemo(() => average(groupRows.map((group) => group.autonomy).filter((value) => value != null)), [groupRows])

  // Fonction pour déterminer le type d'alerte d'un site
  const getSiteAlertType = (site) => {
    // Indéterminée / sans fonctionnement → pas d’alerte d’autonomie
    if (site.is_infinite_consumption) return null
    if (site.is_infinite_autonomy || site.is_sans_fonctionnement) return null
    // Autonomie finie
    if (site.autonomie_hours != null) {
      if (site.autonomie_hours < 24) {
        return { type: 'critique', priority: 'urgent', label: 'Temps restant critique (< 24 h)' }
      }
      if (site.autonomie_hours < 36) {
        return { type: 'alerte', priority: 'warning', label: 'Temps restant faible (< 36 h)' }
      }
    }
    return null
  }

  const getGroupEcartPct = (g) => {
    // Écart de conso horaire uniquement (référence semaine N-1)
    if (g.latest_hourly_consumption == null || g.previous_hourly_consumption == null || !(g.previous_hourly_consumption > 0)) return null
    return Math.abs(
      ((g.latest_hourly_consumption - g.previous_hourly_consumption) / g.previous_hourly_consumption) * 100,
    )
  }

  const isConsSansDelta = (g) => g.latest_consumption > 0 && !(g.latest_hours > 0)
  const isEcartConso = (g) => {
    const ecart = getGroupEcartPct(g)
    return ecart != null && ecart > 15.0
  }

  const alerts = useMemo(() => {
    const rows = Array.isArray(dashboardData?.alerts) ? dashboardData.alerts : []
    return rows
      .map(normalizePersistedAlert)
      .filter((a) => a && !a.traitee && !isIndeterminateAutonomyAlert(a))
  }, [dashboardData])

  const summaryCards = useMemo(() => {
    if (!dashboardData) return []

    // Sites urgents = alertes critiques ciblées sur un site, pour rester cohérent
    // avec la liste d'alertes réellement déclarées par le backend.
    const criticalSiteAlertCount = alerts.filter((alert) => {
      if (alert.target !== 'site' && alert.site_id == null) return false
      return resolvePrioriteKey(alert) === 'critique'
    }).length

    // Compteur aligné sur la liste filtrée (hors autonomie indéterminée)
    const activeAlertCount = alerts.length

    const totalConsumption = dashboardData.summary?.total_consumption ?? 0
    const previousTotalConsumption = dashboardData.summary?.previous_total_consumption ?? null
    const totalRuntime = dashboardData.summary?.total_runtime ?? 0
    const previousTotalRuntime = dashboardData.summary?.previous_total_runtime ?? null

    const consumptionDeviation = getDeviation(totalConsumption, previousTotalConsumption)
    const runtimeDeviation = getDeviation(totalRuntime, previousTotalRuntime)

    return [
      {
        label: 'Sites urgents',
        title: `${criticalSiteAlertCount}`,
        detail: 'Alertes critiques de site actives',
        tone: criticalSiteAlertCount > 0 ? 'danger' : null,
        open: () => goSites(),
      },
      {
        label: 'Alertes',
        title: `${activeAlertCount}`,
        detail: activeAlertCount === 1 ? 'Alerte active à traiter' : 'Alertes actives à traiter',
        tone: activeAlertCount > 0 ? 'danger' : null,
        open: () => onNavigate?.({ view: 'alerts' }),
      },
      {
        label: 'Consommation',
        title: formatValue(totalConsumption, ' L'),
        detail: 'Semaine N (vs semaine N-1)',
        deviation: {
          value: consumptionDeviation,
          isNegative: consumptionDeviation !== null && consumptionDeviation < 0,
          text: consumptionDeviation == null ? '—' : `${Math.abs(consumptionDeviation).toFixed(1)}%`,
        },
      },
      {
        label: 'Delta horaire',
        title: formatValue(totalRuntime, ' h'),
        detail: 'Semaine N (vs semaine N-1)',
        deviation: {
          value: runtimeDeviation,
          isNegative: runtimeDeviation !== null && runtimeDeviation < 0,
          text: runtimeDeviation == null ? '—' : `${Math.abs(runtimeDeviation).toFixed(1)}%`,
        },
      },
    ]
  }, [dashboardData, siteRows, alerts, onNavigate])

  // 1. Sites avec autonomie chiffrée — hors indéterminée / sans fonctionnement, tri croissant
  const lowAutonomySiteRows = useMemo(() => {
    if (!siteRows.length) return []
    return [...siteRows]
      .map((site) => ({
        ...site,
        site_name: site.site_name || site.nom_site || site.nom || site.label || `Site ${site.id}`,
      }))
      .filter((s) => {
        if (s.is_infinite_consumption) return false
        if (s.is_sans_fonctionnement || s.is_infinite_autonomy) return false
        return s.autonomie_hours != null
      })
      .sort((a, b) => (a.autonomie_hours ?? 999) - (b.autonomie_hours ?? 999))
      .slice(0, 8)
  }, [siteRows])

  // 2. Écarts de conso horaire > 15 % — hors « Non dispo. », |écart| décroissant
  const abnormalGroupRows = useMemo(() => {
    if (!groupRows.length) return []
    return [...groupRows]
      .filter((g) => isEcartConso(g))
      .map((g) => ({ ...g, _ecart: getGroupEcartPct(g) || 0 }))
      .sort((a, b) => (b._ecart || 0) - (a._ecart || 0))
      .slice(0, 6)
  }, [groupRows])

  // 3. Groupes les plus gourmands
  const topConsumerGroupRows = useMemo(() => {
    if (!groupRows.length) return []
    return [...groupRows]
      .sort((a, b) => b.avg_consumption - a.avg_consumption)
      .slice(0, 6)
  }, [groupRows])
  // 4. Sites les plus gourmands (avec colonnes simplifiées)
  const topConsumerSiteRows = useMemo(() => {
    if (!siteRows.length) return []
    return [...siteRows]
      .sort((a, b) => b.avg_consumption - a.avg_consumption)
      .slice(0, 6)
  }, [siteRows])

  const alertCounts = useMemo(() => countAlertsBySeverity(alerts), [alerts])
  const previewAlerts = useMemo(() => pickPreviewAlerts(alerts, { maxTotal: 3 }), [alerts])

  const openAlertInCenter = (alert) => {
    onNavigate?.({
      view: 'alerts',
      alertId: alert.id || alert.cle,
      priority: resolvePrioriteKey(alert) || 'all',
    })
  }

  if (!dashboardData) {
    return (
      <div className="app-shell dashboard-shell">
        <Topbar activeView="dashboard" onNavigate={onNavigate} />
        {loadError ? (
          <EmptyState
            icon={<CircleAlert size={40} />}
            title="Impossible de charger le tableau de bord"
            description={loadError}
            action={{ label: 'Réessayer', onClick: () => window.location.reload() }}
          />
        ) : (
          <PageLoader label="Préparation du tableau de bord…" />
        )}
      </div>
    )
  }

  return (
    <div className="app-shell dashboard-shell">
      <Topbar activeView="dashboard" onNavigate={onNavigate} />

      <PageEnter>
        <div className="page-layout">
          <main className="dashboard-grid dashboard-grid-4col">
        <WelcomeBanner />

        <div className="dashboard-summary-grid">
          {summaryCards.map((card) => (
            <button
              key={card.label}
              type="button"
              className={`metric-panel dashboard-summary-card dashboard-summary-card--link${card.tone ? ` dashboard-summary-card--${card.tone}` : ''}`}
              onClick={card.open}
              disabled={!card.open}
            >
              <div className="summary-card-header">
                <span className="metric-label">{card.label}</span>
                {card.deviation ? (
                  <span className={`summary-trend ${card.deviation.isNegative ? 'negative' : 'positive'}`}>
                    <span className="summary-trend-arrow">{card.deviation.isNegative ? '▼' : '▲'}</span>
                    {card.deviation.text}
                  </span>
                ) : null}
              </div>
              <h3>{card.title}</h3>
              <p>{card.detail}</p>
            </button>
          ))}
        </div>

        <section className="dashboard-alerts metric-panel" style={{ gridColumn: '1 / -1' }}>
          <div className="metric-title-row alert-section-head">
            <div>
              <h3>Notifications d’alertes</h3>
            </div>
            <div className="dashboard-alerts-actions">
              {alerts.length > 0 && (
                <div className="alert-legend alert-legend--static" aria-label="Répartition des alertes">
                  <span className="alert-legend-item alert-legend--critical is-active">Critique <strong>{alertCounts.critique}</strong></span>
                  <span className="alert-legend-item alert-legend--high is-active">Haute <strong>{alertCounts.haute}</strong></span>
                  <span className="alert-legend-item alert-legend--medium is-active">Moyenne <strong>{alertCounts.moyenne}</strong></span>
                  <span className="alert-legend-item alert-legend--low is-active">Basse <strong>{alertCounts.basse}</strong></span>
                </div>
              )}
            </div>
          </div>
          <div className="alert-list alert-list--compact">
            {previewAlerts.length ? previewAlerts.map((alert) => {
              const severity = alert.severity || 'medium'
              const label = alert.priority || 'Moyenne'
              return (
                <button
                  key={alert.id}
                  type="button"
                  className={`alert-item alert-item--compact alert-${severity} alert-item--preview alert-item--link`}
                  data-severity={severity}
                  onClick={() => openAlertInCenter(alert)}
                >
                  <div className="alert-severity-bar" aria-hidden="true" />
                  <div className="alert-header alert-header--compact">
                    <strong className="alert-preview-title">{alert.title}</strong>
                    <span className={`alert-level-tag alert-level-tag--${severity}`}>
                      {label}
                    </span>
                  </div>
                  {alert.subtitle ? (
                    <p className="alert-detail alert-detail--preview">{alert.subtitle}</p>
                  ) : null}
                </button>
              )
            }) : (
              <div className="alert-empty">
                Aucune alerte majeure détectée pour le moment.
              </div>
            )}
          </div>
          {alerts.length > previewAlerts.length && (
            <div className="dashboard-alerts-footer">
              <Button
                variant="outline"
                onClick={() => onNavigate?.({
                  view: 'alerts',
                  priority: alertCounts.critique > 0 ? 'critique' : 'all',
                })}
              >
                Plus d’alertes
                <span
                  className="dashboard-alerts-more-count"
                  aria-label={`${alerts.length - previewAlerts.length} autres non traitées`}
                >
                  {alerts.length - previewAlerts.length}
                </span>
              </Button>
            </div>
          )}
        </section>

        {/* 1. Sites à faible autonomie */}
        <section className="dashboard-table metric-panel">
          <button
            type="button"
            className="metric-title-row metric-title-row--link"
            onClick={() => goSites()}
          >
            <div>
              <span className="metric-label">Priorité stock</span>
              <h3>Autonomie des sites</h3>
            </div>
            <span className="dashboard-section-link" aria-hidden="true">Ouvrir →</span>
          </button>
          <div className="dashboard-table-scroll">
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Site</th>
                  <th style={{ textAlign: 'right' }}>Dernier stock</th>
                  <th style={{ textAlign: 'right' }}>Conso. semaine N</th>
                  <th style={{ textAlign: 'right' }}>Conso. semaine N-1</th>
                  <th style={{ textAlign: 'right' }}>Écart-type</th>
                  <th style={{ textAlign: 'center' }}>Temps restant</th>
                </tr>
              </thead>
              <tbody>
                {lowAutonomySiteRows.map((row) => {
                  const severity = getAutonomySeverity(row)
                  const level = severity === 'critical' ? 'critical' : severity === 'medium' ? 'medium' : severity === 'idle' ? 'idle' : 'low'
                  return (
                    <tr
                      key={row.id}
                      className={`autonomy-row autonomy-row--${level} dashboard-row-link`}
                      onClick={() => goSites(row)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          goSites(row)
                        }
                      }}
                      tabIndex={0}
                      role="link"
                      aria-label={`Ouvrir le site ${row.site_name || row.label}`}
                    >
                      <td style={{ textAlign: 'left' }}>{row.site_name || row.label}</td>
                      <td style={{ textAlign: 'right' }}>{formatValue(row.latest_volume, ' L')}</td>
                      <td style={{ textAlign: 'right' }}>{formatValue(row.latest_consumption, ' L')}</td>
                      <td style={{ textAlign: 'right' }}>
                        {row.previous_consumption == null ? '—' : formatValue(row.previous_consumption, ' L')}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {row.consumption_stddev == null ? '—' : formatValue(row.consumption_stddev, ' L')}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <AutonomyBadge entity={row} size="sm" showLabel={false} />
                      </td>
                    </tr>
                  )
                })}
                {lowAutonomySiteRows.length === 0 && (
                  <tr>
                    <td colSpan="6" className="empty-state-cell">
                      Aucun site en tension pour le moment
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 2. Groupes à consommation anormale */}
        <section className="dashboard-table metric-panel">
          <button
            type="button"
            className="metric-title-row metric-title-row--link"
            onClick={() => goGroups({ mode: 'details' })}
          >
            <div>
              <span className="metric-label">Anomalies</span>
              <h3>Écart de consommation horaire</h3>
            </div>
            <span className="dashboard-section-link" aria-hidden="true">Ouvrir →</span>
          </button>
          <div className="dashboard-table-scroll">
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Groupe</th>
                  <th style={{ textAlign: 'left' }}>Site</th>
                  <th style={{ textAlign: 'right' }}>Consommation horaire moyenne</th>
                  <th style={{ textAlign: 'right' }}>Consommation horaire semaine N</th>
                  <th style={{ textAlign: 'right' }}>Consommation horaire semaine N-1</th>
                  <th style={{ textAlign: 'center' }}>Écart</th>
                </tr>
              </thead>
              <tbody>
                {abnormalGroupRows.map((row) => (
                  <tr
                    key={row.id}
                    className="dashboard-row-link"
                    onClick={() => goGroups(row)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        goGroups(row)
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`Ouvrir le groupe ${row.label}`}
                  >
                    <td style={{ textAlign: 'left' }}>{row.label}</td>
                    <td style={{ textAlign: 'left' }}>{row.site_name || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <strong className="text-danger">
                        {formatValue(row.mean_hourly_consumption_deduite)}
                      </strong>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {formatValue(row.latest_hourly_consumption)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {formatValue(row.previous_hourly_consumption)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {renderEcartVsN1(row.latest_hourly_consumption, row.previous_hourly_consumption, '—')}
                    </td>
                  </tr>
                ))}
                {abnormalGroupRows.length === 0 && (
                  <tr>
                    <td colSpan="6" className="empty-state-cell">
                      Aucun écart horaire au-dessus du seuil
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 3. Groupes les plus gourmands */}
        <section className="dashboard-table metric-panel">
          <button
            type="button"
            className="metric-title-row metric-title-row--link"
            onClick={() => goGroups()}
          >
            <div>
              <span className="metric-label">Consommation</span>
              <h3>Groupes à plus forte consommation</h3>
            </div>
            <span className="dashboard-section-link" aria-hidden="true">Ouvrir →</span>
          </button>
          <div className="dashboard-table-scroll">
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Groupe</th>
                  <th style={{ textAlign: 'left' }}>Site</th>
                  <th style={{ textAlign: 'right' }}>Consommation moyenne</th>
                  <th style={{ textAlign: 'right' }}>Consommation semaine N-1</th>
                  <th style={{ textAlign: 'right' }}>Consommation semaine N</th>
                  <th style={{ textAlign: 'center' }}>Écart</th>
                </tr>
              </thead>
              <tbody>
                {topConsumerGroupRows.map((row) => (
                  <tr
                    key={row.id}
                    className="dashboard-row-link"
                    onClick={() => goGroups(row)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        goGroups(row)
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`Ouvrir le groupe ${row.label}`}
                  >
                    <td style={{ textAlign: 'left' }}>{row.label}</td>
                    <td style={{ textAlign: 'left' }}>{row.site_name || '—'}</td>
                    <td style={{ textAlign: 'right' }}><strong>{formatValue(row.avg_consumption, ' L')}</strong></td>
                    <td style={{ textAlign: 'right' }}>{row.previous_consumption == null ? '—' : formatValue(row.previous_consumption, ' L')}</td>
                    <td style={{ textAlign: 'right' }}>{formatValue(row.latest_consumption, ' L')}</td>
                    <td style={{ textAlign: 'center' }}>{renderEcartVsN1(row.latest_consumption, row.previous_consumption, '—')}</td>
                  </tr>
                ))}
                {topConsumerGroupRows.length === 0 && (
                  <tr>
                    <td colSpan="6" className="empty-state-cell">
                      Aucun groupe disponible
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 4. Sites les plus gourmands */}
        <section className="dashboard-table metric-panel">
          <button
            type="button"
            className="metric-title-row metric-title-row--link"
            onClick={() => goSites()}
          >
            <div>
              <span className="metric-label">Consommation</span>
              <h3>Sites à plus forte consommation</h3>
            </div>
            <span className="dashboard-section-link" aria-hidden="true">Ouvrir →</span>
          </button>
          <div className="dashboard-table-scroll">
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Site</th>
                  <th style={{ textAlign: 'right' }}>Consommation moyenne</th>
                  <th style={{ textAlign: 'right' }}>Consommation semaine N-1</th>
                  <th style={{ textAlign: 'right' }}>Consommation semaine N</th>
                  <th style={{ textAlign: 'center' }}>Écart</th>
                </tr>
              </thead>
              <tbody>
                {topConsumerSiteRows.map((row) => (
                  <tr
                    key={row.id}
                    className="dashboard-row-link"
                    onClick={() => goSites(row)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        goSites(row)
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`Ouvrir le site ${row.site_name || row.label}`}
                  >
                    <td style={{ textAlign: 'left' }}>{row.site_name || row.label}</td>
                    <td style={{ textAlign: 'right' }}><strong>{formatValue(row.avg_consumption, ' L')}</strong></td>
                    <td style={{ textAlign: 'right' }}>{row.previous_consumption == null ? '—' : formatValue(row.previous_consumption, ' L')}</td>
                    <td style={{ textAlign: 'right' }}>{formatValue(row.latest_consumption, ' L')}</td>
                    <td style={{ textAlign: 'center' }}>{renderEcartVsN1(row.latest_consumption, row.previous_consumption, '—')}</td>
                  </tr>
                ))}
                {topConsumerSiteRows.length === 0 && (
                  <tr>
                    <td colSpan="5" className="empty-state-cell">
                      Aucun site disponible
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>
        </div>
      </PageEnter>
    </div>
  )
}

export default DashboardPage