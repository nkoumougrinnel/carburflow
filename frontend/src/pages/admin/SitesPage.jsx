import React, {useCallback, useEffect, useMemo, useState } from 'react'
import Topbar from '@/components/Topbar.jsx'
import WelcomeBanner from '@/components/WelcomeBanner.jsx'
import Button from '@/components/ui/button.jsx'
import { EmptyState } from '@/components/ui/empty-state.jsx'
import { Select } from '@/components/ui/select.jsx'
import { StatusBadge } from '@/components/ui/status-badge.jsx'
import { apiFetch } from '@/auth.js'
import AutonomyBadge from '@/components/AutonomyBadge.jsx'
import PageLoader from '@/components/PageLoader.jsx'
import PageEnter from '@/components/PageEnter.jsx'
import { useChartPalette } from '@/hooks/useChartPalette.js'
import { createChart, defaultPeriodIndices, MAX_CHART_WEEKS, seriesPointRadius, toChartLabels, visibleChartRange, xAxisTicks } from '@/utils/chartAxis.js'
import { formatAutonomyValue, getAutonomySeverity } from '@/utils/format.js'
import { windowStats } from '@/utils/stats.js'
import { aggregateSeries, aggregateHoursSeries } from '@/utils/chart-utils.js'
import { normalizePersistedAlert } from '@/utils/alerts.js'

function formatWhen(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

function SitesPage({ onNavigate }) {
  const chartPalette = useChartPalette()
  const [sitesDashboard, setsitesDashboard] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [startIdx, setStartIdx] = useState(0)
  const [endIdx, setEndIdx] = useState(0)
  const [siteId, setSiteId] = useState('')
  const [siteAlerts, setSiteAlerts] = useState({})
  const [chartPan, setChartPan] = useState(0)
  const querySiteId = useMemo(() => new URLSearchParams(window.location.search).get('siteId'), [])
  const querySiteName = useMemo(() => new URLSearchParams(window.location.search).get('siteName'), [])
  const queryMode = useMemo(() => new URLSearchParams(window.location.search).get('mode'), [])
  const [mode, setMode] = useState(queryMode || (querySiteId ? 'details' : 'all'))

  const renderDelta = (metric, suffix = '') => {
    if (metric?.has_previous_period === false) {
      return <small className="delta-neutral"></small>
    }
    const deltaValue = typeof metric?.variation_pct === 'number'
      ? `${metric.variation_pct >= 0 ? '+' : ''}${metric.variation_pct.toFixed(1)} %`
      : '—'
    const deltaClass = (metric?.variation_pct ?? 0) >= 0 ? 'delta-up' : 'delta-down'
    return <small className={deltaClass}>{deltaValue}{suffix}</small>
  }

  const renderMeanDelta = (metric, suffix = '') => {
    if (metric?.has_previous_period === false) {
      return <small className="delta-neutral"></small>
    }
    const deltaValue = typeof metric?.mean_variation_pct === 'number'
      ? `${metric.mean_variation_pct >= 0 ? '+' : ''}${metric.mean_variation_pct.toFixed(1)} %`
      : '—'
    const deltaClass = (metric?.mean_variation_pct ?? 0) >= 0 ? 'delta-up' : 'delta-down'
    return <small className={deltaClass}>{deltaValue}{suffix}</small>
  }

  // Fonction pour charger les alertes du site
  const loadSiteAlerts = useCallback(async () => {
    try {
      const rows = await apiFetch('/api/alertes/?etat=actives').catch(() => [])
      const normalized = (Array.isArray(rows) ? rows : [])
        .map(normalizePersistedAlert)
        .filter(Boolean)
        .filter((a) => !a.traitee)
      const bySite = {}
      normalized.forEach((alert) => {
        const sid = alert.site_id ? String(alert.site_id) : null
        if (sid) {
          if (!bySite[sid]) bySite[sid] = []
          bySite[sid].push(alert)
        }
      })
      setSiteAlerts(bySite)
    } catch (err) {
      console.warn('Impossible de charger les alertes par site:', err)
      setSiteAlerts({})
    }
  }, [])

  useEffect(() => {
    const loadSitesData = async () => {
      try {
        setLoadError('')
        const data = await apiFetch('/api/dashboard/sites')
        if (!data?.labels || !Array.isArray(data.labels)) {
          throw new Error('Réponse API sites inattendue')
        }
        const rawHours = data.hoursSeries || []
        const hoursList = Array.isArray(rawHours) ? rawHours : Object.values(rawHours)
        setsitesDashboard({
          labels: data.labels,
          volumeSeries: data.volumeSeries || [],
          hoursSeries: hoursList.map((site) => ({
            id: site.id,
            nom_site: site.nom_site,
            datasets: site.datasets || [],
          })),
          consumptionSeries: data.consumptionSeries || [],
          autonomyBySite: data.autonomyBySite || {},
          groupsBySite: data.groupsBySite || {},
          defaultSiteId: data.defaultSiteId,
        })
        await loadSiteAlerts()
      } catch (error) {
        console.warn('Site backend unavailable.', error)
        setsitesDashboard(null)
        setLoadError(error.message || 'Impossible de charger les sites.')
      }
    }
    loadSitesData()
  }, [loadSiteAlerts])

  const siteOptions = useMemo(() => {
    if (!sitesDashboard) return []
    const byId = new Map()
    ;[...(sitesDashboard.volumeSeries || []), ...(sitesDashboard.consumptionSeries || []), ...(sitesDashboard.hoursSeries || [])].forEach((site) => {
      byId.set(String(site.id), site)
    })
    return [...byId.values()]
  }, [sitesDashboard])

  useEffect(() => {
    if (!sitesDashboard) return
    if (querySiteId && sitesDashboard) {
      const matchingSite = siteOptions.find((site) => String(site.id) === querySiteId || site.nom_site === querySiteName)
      if (matchingSite) {
        setSiteId(String(matchingSite.id))
      }
    }
    if (sitesDashboard.labels?.length) {
      const { first, last } = defaultPeriodIndices(sitesDashboard.labels.length)
      setStartIdx(first)
      setEndIdx(last)
    }
  }, [sitesDashboard, querySiteId, querySiteName, siteOptions])

  const periodStart = Math.min(startIdx, endIdx)
  const periodEnd = Math.max(startIdx, endIdx)
  const chartWindow = useMemo(
    () => visibleChartRange(periodStart, periodEnd, chartPan),
    [periodStart, periodEnd, chartPan],
  )
  const { viewStart, viewEnd, maxPan, canScroll } = chartWindow

  useEffect(() => {
    setChartPan(Math.max(0, periodEnd - periodStart + 1 - MAX_CHART_WEEKS))
  }, [periodStart, periodEnd])

  const selectedSite = useMemo(() => {
    if (!sitesDashboard || mode === 'all' || !siteId) return null
    return [...(sitesDashboard.volumeSeries || []), ...(sitesDashboard.consumptionSeries || []), ...(sitesDashboard.hoursSeries || [])].find((entry) => String(entry.id) === String(siteId)) || null
  }, [sitesDashboard, siteId, mode])

  const siteVolumeData = useMemo(() => {
    if (!sitesDashboard?.volumeSeries?.length) return []
    if (mode === 'all' || !siteId) return aggregateSeries(sitesDashboard.volumeSeries)
    return sitesDashboard.volumeSeries.find((entry) => String(entry.id) === String(selectedSite?.id))?.data || []
  }, [selectedSite, sitesDashboard, siteId, mode])

  const siteConsumptionData = useMemo(() => {
    if (!sitesDashboard?.consumptionSeries?.length) return []
    if (mode === 'all' || !siteId) return aggregateSeries(sitesDashboard.consumptionSeries)
    return sitesDashboard.consumptionSeries.find((entry) => String(entry.id) === String(selectedSite?.id))?.data || []
  }, [selectedSite, sitesDashboard, siteId, mode])

  const siteHoursData = useMemo(() => {
    if (!sitesDashboard?.hoursSeries?.length) return []
    if (mode === 'all' || !siteId) {
      return aggregateHoursSeries(sitesDashboard.hoursSeries)
    }
    const matchingEntry = sitesDashboard.hoursSeries.find((entry) => String(entry.id) === String(selectedSite?.id))
    return matchingEntry ? aggregateHoursSeries([matchingEntry]) : []
  }, [selectedSite, sitesDashboard, siteId, mode])

  const siteVolumeStats = windowStats(siteVolumeData, periodStart, periodEnd)
  const siteConsumptionStats = windowStats(siteConsumptionData, periodStart, periodEnd, { ignoreZeros: true })
  const siteHoursStats = windowStats(siteHoursData, periodStart, periodEnd, { ignoreZeros: true })

  const siteAutonomy = useMemo(() => {
    if (!sitesDashboard?.autonomyBySite) return null
    const resolvedSiteId = String(siteId || selectedSite?.id || '')
    if (!resolvedSiteId) return null
    return sitesDashboard.autonomyBySite[resolvedSiteId] || null
  }, [sitesDashboard, siteId, selectedSite])

  const siteAttachedGroups = useMemo(() => {
    if (!sitesDashboard?.groupsBySite || (!siteId && !selectedSite?.id) || mode !== 'details') return []
    const resolvedSiteId = String(siteId || selectedSite?.id || '')
    const direct = sitesDashboard.groupsBySite[resolvedSiteId]
    if (Array.isArray(direct)) return direct
    const fallback = Object.entries(sitesDashboard.groupsBySite || {}).find(
      ([key]) => String(key) === resolvedSiteId,
    )
    return fallback ? fallback[1] : []
  }, [sitesDashboard, siteId, mode, selectedSite])

  const openGroup = (group) => {
    onNavigate?.({
      view: 'groups',
      groupId: group.id,
      groupLabel: group.label,
      mode: 'details',
    })
  }

  const openSiteDetails = (site) => {
    const id = String(site.id)
    setSiteId(id)
    setMode('details')
    onNavigate?.({
      view: 'sites',
      siteId: id,
      siteName: site.nom_site,
      mode: 'details',
    })
  }

  const openSiteAlerts = (siteId) => {
    onNavigate?.({
      view: 'alerts',
      siteId: siteId,
    })
  }

  const siteTableRows = useMemo(() => {
    if (!sitesDashboard?.volumeSeries?.length) return []
    const filteredSites = siteId
      ? (sitesDashboard.volumeSeries || []).filter((site) => String(site.id) === String(siteId))
      : (sitesDashboard.volumeSeries || [])
    return filteredSites.map((site) => {
      const volumeSeries = site?.data || []
      const consumptionSeries = (sitesDashboard.consumptionSeries || []).find((entry) => String(entry.id) === String(site.id))?.data || []
      const matchingHours = (sitesDashboard.hoursSeries || []).find((entry) => String(entry.id) === String(site.id))
      const hoursSeries = matchingHours ? aggregateHoursSeries([matchingHours]) : []
      const siteIdStr = String(site.id)
      const alerts = siteAlerts[siteIdStr] || []
      return {
        id: site.id,
        nom_site: site.nom_site,
        volume: windowStats(volumeSeries, periodStart, periodEnd),
        consumption: windowStats(consumptionSeries, periodStart, periodEnd, { ignoreZeros: true }),
        hours: windowStats(hoursSeries, periodStart, periodEnd, { ignoreZeros: true }),
        alerts,
        alertsCount: alerts.length,
      }
    })
  }, [sitesDashboard, periodStart, periodEnd, siteId, siteAlerts])

  useEffect(() => {
    if (!window.Chart || !sitesDashboard || mode === 'all') return undefined
    const charts = []
    const fullLabels = sitesDashboard.labels || []
    const labels = toChartLabels(fullLabels.slice(viewStart, viewEnd + 1))
    const fullLabelsWindow = fullLabels.slice(viewStart, viewEnd + 1)
    const sliceSeries = (values = []) => values.slice(viewStart, viewEnd + 1)
    const pointRadius = seriesPointRadius(labels.length)
    const createLineChart = (id, data, color, fill = false) => {
      const ctx = document.getElementById(id)
      if (!ctx) return
      const chart = createChart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: id,
            data: sliceSeries(data),
            borderColor: color,
            backgroundColor: fill ? `${color}22` : 'transparent',
            borderWidth: 3,
            tension: 0.35,
            fill,
            pointRadius,
            spanGaps: true,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          spanGaps: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: (items) => {
                  const idx = items?.[0]?.dataIndex
                  return fullLabelsWindow[idx] != null ? String(fullLabelsWindow[idx]) : ''
                },
              },
            },
          },
          scales: {
            x: {
              ticks: xAxisTicks(labels.length, chartPalette.text),
              grid: { color: chartPalette.grid },
            },
            y: {
              ticks: { color: chartPalette.text },
              grid: { color: chartPalette.grid },
            },
          },
        },
      })
      if (chart) charts.push(chart)
    }

    createLineChart('chart-site-volume', siteVolumeData, '#0b3d7a', true)
    createLineChart('chart-site-hours', siteHoursData, '#3b82f6', true)
    createLineChart('chart-site-consumption', siteConsumptionData, '#60a5fa', true)

    const onWheel = (event) => {
      if (!canScroll) return
      event.preventDefault()
      const step = event.deltaY > 0 ? 1 : -1
      setChartPan((prev) => Math.min(maxPan, Math.max(0, prev + step)))
    }
    const chartBoxes = document.querySelectorAll('.chart-box')
    chartBoxes.forEach((box) => box.addEventListener('wheel', onWheel, { passive: false }))

    return () => {
      charts.forEach((chart) => chart.destroy())
      chartBoxes.forEach((box) => box.removeEventListener('wheel', onWheel))
    }
  }, [chartPalette, sitesDashboard, selectedSite, siteVolumeData, siteHoursData, siteConsumptionData, viewStart, viewEnd, mode, canScroll, maxPan])

  if (!sitesDashboard) {
    return (
      <div className="app-shell dashboard-shell">
        <Topbar activeView="sites" onNavigate={onNavigate} />
        {loadError ? (
          <div className="loading-state" style={{ marginTop: 24 }}>
            {loadError}
            <div style={{ marginTop: 12 }}>
              <Button variant="primary" onClick={() => window.location.reload()}>
                Réessayer
              </Button>
            </div>
          </div>
        ) : (
          <PageLoader label="Chargement des sites…" />
        )}
      </div>
    )
  }

  return (
    <div className="app-shell dashboard-shell">
      <Topbar activeView="sites" onNavigate={onNavigate} />

      <PageEnter>
        <main className="page-layout groups-grid">
          <WelcomeBanner
            kicker="Suivi terrain"
            title="Sites"
            subtitle="Niveaux, autonomie et consommation — affinez avec les filtres si besoin."
          />

          <form className="groups-filter-bar" onSubmit={(event) => event.preventDefault()}>
            <Select
              label="Période — début"
              id="site-start"
              value={String(startIdx)}
              onChange={(event) => setStartIdx(Number(event.target.value))}
              options={(sitesDashboard?.labels || []).map((label, index) => ({ label, value: String(index) }))}
            />
            <Select
              label="Période — fin"
              id="site-end"
              value={String(endIdx)}
              onChange={(event) => setEndIdx(Number(event.target.value))}
              options={(sitesDashboard?.labels || []).map((label, index) => ({ label, value: String(index) }))}
            />
            <Select
              label="Site"
              id="site-select"
              value={siteId ?? ''}
              onChange={(event) => {
                const nextSiteId = event.target.value
                setSiteId(nextSiteId)
                if (nextSiteId) {
                  setMode('details')
                } else {
                  setMode('all')
                }
              }}
              options={siteOptions.map((site) => ({ label: site.nom_site, value: String(site.id) }))}
            />
            <Select
              label="Affichage"
              id="view_mode"
              value={mode}
              onChange={(event) => setMode(event.target.value)}
              options={[
                { label: 'Vue d’ensemble', value: 'all' },
                { label: 'Détail', value: 'details' },
              ]}
            />
          </form>

          {mode === 'all' ? (
            <section className="site-overview">
              <div className="section-title-wrap">
                <span className="metric-label">Sites</span>
                <h2>{selectedSite?.nom_site || (siteId ? 'Site sélectionné' : 'Tous les sites')}</h2>
              </div>

              <div className="dashboard-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Site</th>
                      <th style={{ textAlign: 'right' }}>Stock</th>
                      <th style={{ textAlign: 'right' }}>Consommation</th>
                      <th style={{ textAlign: 'right' }}>Évolution</th>
                      <th style={{ textAlign: 'center' }}>Autonomie</th>
                      <th style={{ textAlign: 'center' }}>Alertes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siteTableRows.length > 0 ? (
                      siteTableRows.map((site) => {
                        const siteAut = sitesDashboard?.autonomyBySite?.[String(site.id)] || {}
                        const severity = getAutonomySeverity(siteAut)
                        const alertsCount = site.alertsCount || 0
                        return (
                          <tr
                            key={site.id}
                            className={`autonomy-row autonomy-row--${severity} dashboard-row-link`}
                            onClick={() => openSiteDetails(site)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                openSiteDetails(site)
                              }
                            }}
                            tabIndex={0}
                            role="link"
                            aria-label={`Ouvrir le détail du site ${site.nom_site}`}
                          >
                            <td style={{ textAlign: 'left' }}>{site.nom_site}</td>
                            <td style={{ textAlign: 'right' }}>
                              <strong>{site.volume.latest.toFixed(1)} L</strong>
                              <div className="viewer-cp-tag">{renderDelta(site.volume)}</div>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <strong>{site.consumption.total.toFixed(1)} L</strong>
                              <div className="viewer-cp-tag">{renderDelta(site.consumption)}</div>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {site.consumption.previous_total != null ? (
                                <span className={site.consumption.variation_pct >= 0 ? 'delta-up' : 'delta-down'}>
                                  {site.consumption.variation_pct >= 0 ? '▲' : '▼'} {Math.abs(site.consumption.variation_pct || 0).toFixed(1)}%
                                </span>
                              ) : (
                                <span className="delta-neutral">—</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <AutonomyBadge entity={siteAut} size="sm" />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {alertsCount > 0 ? (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  className="site-alert-chip"
                                  title={`${alertsCount} alerte${alertsCount > 1 ? 's' : ''} active${alertsCount > 1 ? 's' : ''}`}
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    openSiteAlerts(site.id)
                                  }}
                                >
                                  {alertsCount} {alertsCount > 1 ? 'alertes' : 'alerte'}
                                </Button>
                              ) : (
                                <span className="site-alert-none">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={6}>
                          <EmptyState
                            icon={<div className="text-muted">📍</div>}
                            title="Aucun site disponible"
                            description="Il n'y a actuellement aucun site enregistré dans le système."
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <article
              key={selectedSite?.id || 'site-details'}
              className="group-card"
              style={{
                position: 'relative',
                borderLeft: `4px solid ${selectedSite?.color || '#0b3d7a'}`,
                padding: '1.5rem'
              }}
            >
              <section className="site-overview">
                {/* Badge d'autonomie en haut à droite */}
                {selectedSite && siteAutonomy && (
                  <div className="site-autonomy-float" aria-label={`Temps restant : ${formatAutonomyValue(siteAutonomy)}`}>
                    <AutonomyBadge entity={siteAutonomy} size="lg" />
                  </div>
                )}

                <div className="section-title-wrap">
                  <span className="metric-label">Sites</span>
                  <h2>{selectedSite?.nom_site || 'Tous les sites'}</h2>
                </div>

                {/* Groupes rattachés */}
                {mode === 'details' && selectedSite && (
                  <section className="site-attached-groups" aria-label="Groupes rattachés">
                    <div className="site-attached-groups-head">
                      <strong>Groupes rattachés</strong>
                      <span>
                        {siteAttachedGroups.length
                          ? `${siteAttachedGroups.length} groupe${siteAttachedGroups.length > 1 ? 's' : ''}`
                          : 'Aucun'}
                      </span>
                    </div>
                    {siteAttachedGroups.length > 0 ? (
                      <ul className="site-attached-groups-list">
                        {siteAttachedGroups.map((group) => {
                          const groupSeverity = getAutonomySeverity(group)
                          return (
                            <li key={group.id}>
                              <button
                                type="button"
                                className="site-attached-group-link"
                                onClick={() => openGroup(group)}
                                title={`Ouvrir le groupe ${group.label}`}
                              >
                                <span className="site-attached-group-name">{group.label}</span>
                                <AutonomyBadge entity={group} size="sm" showLabel={false} />
                                <span className={`site-attached-group-meta autonomy-row--${groupSeverity}`}>Temps restant</span>
                                <span className="site-attached-group-cta">Voir →</span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <p className="site-attached-groups-empty">
                        Aucun groupe électrogène rattaché à ce site.
                      </p>
                    )}
                  </section>
                )}

                {/* Alertes du site */}
                {mode === 'details' && selectedSite && (() => {
                  const siteIdStr = String(selectedSite.id)
                  const alerts = siteAlerts[siteIdStr] || []
                  if (alerts.length === 0) return null
                  return (
                    <section className="site-alerts-section" aria-label="Alertes du site">
                      <div className="site-alerts-head">
                        <strong>Alertes du site</strong>
                        <span>{alerts.length} alerte{alerts.length > 1 ? 's' : ''}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openSiteAlerts(selectedSite.id)}
                        >
                          Voir toutes →
                        </Button>
                      </div>
                      <ul className="site-alerts-list">
                        {alerts.slice(0, 5).map((alert) => {
                          const severityClass = alert.severity || 'medium'
                          const label = alert.priority || 'Moyenne'
                          return (
                            <li key={alert.id} className="site-alert-item">
                              <span className={`alx-pill alx-pill--${severityClass}`}>{label}</span>
                              <span className="site-alert-date">{formatWhen(alert.detected_at)}</span>
                              <span className="site-alert-title">{alert.title}</span>
                              {alert.subtitle && (
                                <span className="site-alert-subtitle">{alert.subtitle}</span>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="site-alert-link"
                                onClick={() => onNavigate?.({
                                  view: 'alerts',
                                  alertId: alert.id,
                                  siteId: selectedSite.id,
                                })}
                              >
                                Voir →
                              </Button>
                            </li>
                          )
                        })}
                        {alerts.length > 5 && (
                          <li className="site-alert-more">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openSiteAlerts(selectedSite.id)}
                            >
                              +{alerts.length - 5} autres alertes
                            </Button>
                          </li>
                        )}
                      </ul>
                    </section>
                  )
                })()}

                {/* 3 graphiques côte à côte */}
                <div className="site-metrics-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1.5rem',
                  marginBottom: '2rem'
                }}>
                  <article className="metric-panel site-metric-card">
                    <span className="metric-label">Delta horaire</span>
                    <h3>{selectedSite ? 'Delta horaire' : 'Delta horaire cumulé'}</h3>
                    <div className="site-metric-stack">
                      <div>
                        <span>Total sur la période de la courbe</span>
                        <strong>{siteHoursStats.total.toFixed(1)} h</strong>
                        {renderDelta(siteHoursStats)}
                      </div>
                      <div>
                        <span>Delta horaire moyen</span>
                        <strong>{siteHoursStats.mean.toFixed(1)} h</strong>
                        {renderMeanDelta(siteHoursStats)}
                      </div>
                    </div>
                    <div className={`chart-box secondary-box${canScroll ? ' is-scrollable' : ''}`}>
                      <canvas id="chart-site-hours" />
                    </div>
                  </article>

                  <article className="metric-panel site-metric-card">
                    <span className="metric-label">Consommation</span>
                    <h3>{selectedSite ? 'Consommation' : 'Consommation cumulée'}</h3>
                    <div className="site-metric-stack">
                      <div>
                        <span>Total sur la période de la courbe</span>
                        <strong>{siteConsumptionStats.total.toFixed(1)} L</strong>
                        {renderDelta(siteConsumptionStats)}
                      </div>
                      <div>
                        <span>Consommation moyenne</span>
                        <strong>{siteConsumptionStats.mean.toFixed(1)} L</strong>
                        {renderMeanDelta(siteConsumptionStats)}
                      </div>
                    </div>
                    <div className={`chart-box secondary-box${canScroll ? ' is-scrollable' : ''}`}>
                      <canvas id="chart-site-consumption" />
                    </div>
                  </article>

                  <article className="metric-panel site-metric-card">
                    <span className="metric-label">Stock</span>
                    <h3>{selectedSite ? 'Volume stock' : 'Volume stock cumulé'}</h3>
                    <div className="site-metric-stack">
                      <div>
                        <span>Stock semaine N (dernière valeur)</span>
                        <strong>{siteVolumeStats.latest.toFixed(1)} L</strong>
                        {renderDelta(siteVolumeStats)}
                      </div>
                      <div>
                        <span>Volume moyen</span>
                        <strong>{siteVolumeStats.mean.toFixed(1)} L</strong>
                        {renderMeanDelta(siteVolumeStats)}
                      </div>
                    </div>
                    <div className={`chart-box secondary-box${canScroll ? ' is-scrollable' : ''}`}>
                      <canvas id="chart-site-volume" />
                    </div>
                  </article>
                </div>
              </section>
            </article>
          )}
        </main>
      </PageEnter>
    </div>
  )
}

export default SitesPage