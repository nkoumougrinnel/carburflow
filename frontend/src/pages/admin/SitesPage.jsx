import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CircleAlert } from 'lucide-react'
import Topbar from '@/components/Topbar.jsx'
import WelcomeBanner from '@/components/WelcomeBanner.jsx'
import { EmptyState } from '@/components/ui/empty-state.jsx'
import { Select } from '@/components/ui/select.jsx'
import AutonomyBadge from '@/components/AutonomyBadge.jsx'
import { apiFetch } from '@/auth.js'
import PageLoader from '@/components/PageLoader.jsx'
import PageEnter from '@/components/PageEnter.jsx'
import PeriodLineChart from '@/components/PeriodLineChart.jsx'
import { defaultPeriodIndices, MAX_CHART_WEEKS, toChartLabels, visibleChartRange } from '@/utils/chartAxis.js'
import { formatAutonomyValue, getAutonomySeverity } from '@/utils/format.js'
import { windowStats } from '@/utils/stats.js'
import { aggregateSeries, aggregateHoursSeries } from '@/utils/chart-utils.js'
import { deltaClass, ecartTitle, formatEcartPct } from '@/utils/ecart.js'
import { DateRangeFilter } from '@/components/DateRangeFilter.jsx'
import { parseDate } from '@/hooks/useDateFilter.js'
import {
  SiteDetailBack,
  SiteDetailHeader,
  SiteDetailLayout,
  SiteMainTankBlock,
} from '@/components/site/SiteDetail.jsx'

function SitesPage({ onNavigate }) {
  const [sitesDashboard, setsitesDashboard] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [startIdx, setStartIdx] = useState(0)
  const [endIdx, setEndIdx] = useState(0)
  const [siteId, setSiteId] = useState('')
  const [chartPan, setChartPan] = useState(0)
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [availableDateRange, setAvailableDateRange] = useState(null)
  const [availableSites, setAvailableSites] = useState([])

  const querySiteId = useMemo(() => new URLSearchParams(window.location.search).get('siteId'), [])
  const querySiteName = useMemo(() => new URLSearchParams(window.location.search).get('siteName'), [])
  const queryMode = useMemo(() => new URLSearchParams(window.location.search).get('mode'), [])
  const [mode, setMode] = useState(queryMode || (querySiteId ? 'details' : 'all'))

  const dateToIndex = (dateIso) => {
    if (!dateIso || !sitesDashboard?.labels?.length) return 0
    const labels = sitesDashboard.labels
    const target = parseDate(dateIso)
    if (!target) return 0
    for (let i = 0; i < labels.length; i++) {
      const labelDate = parseDate(labels[i])
      if (labelDate && labelDate >= target) {
        return i
      }
    }
    return labels.length - 1
  }

  const renderDelta = (metric, suffix = '', invert = false) => {
    if (metric?.has_previous_period === false) {
      return <small className="delta-neutral" title={ecartTitle(null)}></small>
    }
    const pct = typeof metric?.variation_pct === 'number' ? metric.variation_pct : null
    const deltaValue = formatEcartPct(pct) || '—'
    return (
      <small className={deltaClass(pct, { invert })} title={ecartTitle(pct)}>
        {deltaValue}{suffix}
      </small>
    )
  }

  const renderMeanDelta = (metric, suffix = '', invert = false) => {
    if (metric?.has_previous_period === false) {
      return <small className="delta-neutral" title={ecartTitle(null)}></small>
    }
    const pct = typeof metric?.mean_variation_pct === 'number' ? metric.mean_variation_pct : null
    const deltaValue = formatEcartPct(pct) || '—'
    return (
      <small className={deltaClass(pct, { invert })} title={ecartTitle(pct)}>
        {deltaValue}{suffix}
      </small>
    )
  }

  useEffect(() => {
    const loadDateRange = async () => {
      try {
        const rangeData = await apiFetch('/api/sites/date-range')
        if (rangeData && (rangeData.min_date || rangeData.max_date)) {
          setAvailableDateRange({
            min_date: rangeData.min_date,
            max_date: rangeData.max_date,
            reports_count: rangeData.reports_count || 0,
          })
          if (rangeData.max_date) {
            setDateFin(rangeData.max_date)
            const maxDate = new Date(rangeData.max_date)
            const thirtyDaysAgo = new Date(maxDate)
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

            if (rangeData.min_date) {
              const minDate = new Date(rangeData.min_date)
              if (thirtyDaysAgo < minDate) {
                setDateDebut(rangeData.min_date)
              } else {
                setDateDebut(thirtyDaysAgo.toISOString().split('T')[0])
              }
            } else {
              setDateDebut(thirtyDaysAgo.toISOString().split('T')[0])
            }
          }
        }
      } catch (err) {
        console.warn('Impossible de charger la plage de dates:', err)
        setAvailableDateRange(null)
      }
    }
    loadDateRange()
  }, [])

  useEffect(() => {
    const loadSitesList = async () => {
      try {
        const data = await apiFetch('/api/sites/')
        if (data && Array.isArray(data.sites)) {
          setAvailableSites(data.sites)
        }
      } catch (err) {
        console.warn('Impossible de charger la liste des sites:', err)
        setAvailableSites([])
      }
    }
    loadSitesList()
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
          rapport_choices: data.rapport_choices || [],
        })
      } catch (error) {
        console.warn('Site backend unavailable.', error)
        setsitesDashboard(null)
        setLoadError(error.message || 'Impossible de charger les sites.')
      }
    }
    loadSitesData()
  }, [])

  const siteOptions = useMemo(() => {
    if (availableSites.length > 0) {
      return availableSites.map((site) => ({
        id: site.id,
        nom_site: site.nom_site,
      }))
    }
    if (!sitesDashboard) return []
    const byId = new Map()
    ;[...(sitesDashboard.volumeSeries || []), ...(sitesDashboard.consumptionSeries || []), ...(sitesDashboard.hoursSeries || [])].forEach((site) => {
      byId.set(String(site.id), site)
    })
    return [...byId.values()]
  }, [availableSites, sitesDashboard])

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
      if (!availableDateRange && sitesDashboard.rapport_choices?.length > 0) {
        const sorted = [...sitesDashboard.rapport_choices].sort((a, b) => {
          const da = a.date_debut ? new Date(a.date_debut).getTime() : 0
          const db = b.date_debut ? new Date(b.date_debut).getTime() : 0
          return da - db
        })
        if (sorted.length > 0 && !dateDebut) {
          setDateDebut(sorted[0].date_debut || '')
        }
        if (sorted.length > 0 && !dateFin) {
          setDateFin(sorted[sorted.length - 1].date_fin || '')
        }
      }
    }
  }, [sitesDashboard, querySiteId, querySiteName, siteOptions, availableDateRange, dateDebut, dateFin])

  const periodStart = Math.min(startIdx, endIdx)
  const periodEnd = Math.max(startIdx, endIdx)
  const chartWindow = useMemo(
    () => visibleChartRange(periodStart, periodEnd, chartPan),
    [periodStart, periodEnd, chartPan],
  )
  const { viewStart, viewEnd, maxPan, canScroll } = chartWindow
  const chartLabels = useMemo(
    () => toChartLabels((sitesDashboard?.labels || []).slice(viewStart, viewEnd + 1)),
    [sitesDashboard, viewStart, viewEnd],
  )
  const chartFullLabels = useMemo(
    () => (sitesDashboard?.labels || []).slice(viewStart, viewEnd + 1),
    [sitesDashboard, viewStart, viewEnd],
  )
  const sliceChart = (values = []) => values.slice(viewStart, viewEnd + 1)

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
      return {
        id: site.id,
        nom_site: site.nom_site,
        volume: windowStats(volumeSeries, periodStart, periodEnd),
        consumption: windowStats(consumptionSeries, periodStart, periodEnd, { ignoreZeros: true }),
        hours: windowStats(hoursSeries, periodStart, periodEnd, { ignoreZeros: true }),
      }
    })
  }, [sitesDashboard, periodStart, periodEnd, siteId])

  useEffect(() => {
    if (mode === 'all') return undefined
    const onWheel = (event) => {
      if (!canScroll) return
      event.preventDefault()
      const step = event.deltaY > 0 ? 1 : -1
      setChartPan((prev) => Math.min(maxPan, Math.max(0, prev + step)))
    }
    const chartBoxes = document.querySelectorAll('.chart-box')
    chartBoxes.forEach((box) => box.addEventListener('wheel', onWheel, { passive: false }))
    return () => {
      chartBoxes.forEach((box) => box.removeEventListener('wheel', onWheel))
    }
  }, [mode, canScroll, maxPan, viewStart, viewEnd])

  if (!sitesDashboard) {
    return (
      <div className="app-shell dashboard-shell">
        <Topbar activeView="sites" onNavigate={onNavigate} />
        {loadError ? (
          <EmptyState
            icon={<CircleAlert size={40} />}
            title="Impossible de charger les sites"
            description={loadError}
            action={{ label: 'Réessayer', onClick: () => window.location.reload() }}
          />
        ) : (
          <PageLoader label="Chargement des sites…" />
        )}
      </div>
    )
  }

  /* ═══════════════════════════════════════════
     NIVEAU 3 — Vue détail Admin/Responsable
     Socle commun + groupes rattachés (cliquables) + analyse (3 charts).
     Aucun bloc "Alertes du site".
     ═══════════════════════════════════════════ */
  if (mode !== 'all' && selectedSite) {
    const latestVolume = siteVolumeData?.[siteVolumeData.length - 1] ?? 0
    const capacity = selectedSite?.capacity ?? 3000
    const percent = capacity > 0 ? (latestVolume / capacity) * 100 : 0
    const siteForTank = {
      id: selectedSite.id,
      nom: selectedSite.nom_site || selectedSite.label || `Site ${selectedSite.id}`,
      currentVolume: Math.round(latestVolume),
      capacity: Math.round(capacity),
      percent: Number(percent.toFixed(1)),
    }
    const cpId = selectedSite.cp_identifiant || `CP${String(selectedSite.id).padStart(3, '0')}`

    return (
      <div className="app-shell dashboard-shell">
        <Topbar activeView="sites" onNavigate={onNavigate} />

        <PageEnter>
          <main className="page-layout groups-grid">
            <SiteDetailBack onBack={() => { setSiteId(''); setMode('all') }} />

            <SiteDetailLayout>
              {/* Socle commun : en-tête + cuve principale (4 métriques) */}
              <article className="site-detail-card">
                <SiteDetailHeader
                  site={siteForTank}
                  kicker="Sites"
                  subtitle={cpId}
                  rightSlot={siteAutonomy ? (
                    <AutonomyBadge
                      entity={siteAutonomy}
                      size="md"
                      aria-label={`Temps restant : ${formatAutonomyValue(siteAutonomy)}`}
                    />
                  ) : null}
                />
                <SiteMainTankBlock site={siteForTank} />
              </article>

              {/* Groupes rattachés — cliquables, navigation existante conservée */}
              <section className="site-detail-section" aria-label="Groupes rattachés">
                <div className="site-detail-section-head">
                  <div>
                    <span className="metric-label">Groupes rattachés</span>
                    <h3>Groupes électrogènes du site</h3>
                  </div>
                  <span className="site-detail-section-count">
                    {siteAttachedGroups.length} groupe{siteAttachedGroups.length > 1 ? 's' : ''}
                  </span>
                </div>
                {siteAttachedGroups.length > 0 ? (
                  <ul className="site-attached-groups-list">
                    {siteAttachedGroups.map((group) => (
                      <li key={group.id}>
                        <button
                          type="button"
                          className="site-attached-group-link"
                          onClick={() => openGroup(group)}
                          title={`Ouvrir le groupe ${group.label}`}
                        >
                          <span className="site-attached-group-name">{group.label}</span>
                          <AutonomyBadge entity={group} size="sm" showLabel={false} />
                          <span className="site-attached-group-cta">Voir →</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="site-attached-groups-empty">
                    Aucun groupe électrogène rattaché à ce site.
                  </p>
                )}
              </section>

              {/* Analyse — 3 graphiques côte à côte */}
              <section className="site-detail-section" aria-label="Analyse">
                <div className="site-detail-section-head">
                  <div>
                    <span className="metric-label">Analyse</span>
                    <h3>Vue analytique du site</h3>
                  </div>
                </div>
                <div className="site-analysis-grid">
                  <article className="metric-panel site-metric-card">
                    <div className="analysis-indicator-block">
                      <span className="metric-label">Indicateur</span>
                      <h3>Delta horaire</h3>
                      <div className="site-metric-stack">
                      <div>
                        <span>Total sur la période</span>
                        <strong>{siteHoursStats.total.toFixed(1)} h</strong>
                        {renderDelta(siteHoursStats)}
                      </div>
                      <div>
                        <span>Delta horaire moyen</span>
                        <strong>{siteHoursStats.mean.toFixed(1)} h</strong>
                        {renderMeanDelta(siteHoursStats)}
                      </div>
                      </div>
                    </div>
                    <div className="analysis-chart-block">
                      <span className="curve-title">Courbe delta horaire</span>
                      <div className={`chart-box secondary-box${canScroll ? ' is-scrollable' : ''}`}>
                        <PeriodLineChart
                          data={sliceChart(siteHoursData)}
                          labels={chartLabels}
                          fullLabels={chartFullLabels}
                          color="#3b82f6"
                          unit="h"
                          strokeWidth={3}
                        />
                      </div>
                    </div>
                  </article>

                  <article className="metric-panel site-metric-card">
                    <div className="analysis-indicator-block">
                      <span className="metric-label">Indicateur</span>
                      <h3>Consommation</h3>
                      <div className="site-metric-stack">
                      <div>
                        <span>Total sur la période</span>
                        <strong>{siteConsumptionStats.total.toFixed(1)} L</strong>
                        {renderDelta(siteConsumptionStats)}
                      </div>
                      <div>
                        <span>Consommation moyenne</span>
                        <strong>{siteConsumptionStats.mean.toFixed(1)} L</strong>
                        {renderMeanDelta(siteConsumptionStats)}
                      </div>
                      </div>
                    </div>
                    <div className="analysis-chart-block">
                      <span className="curve-title">Courbe consommation</span>
                      <div className={`chart-box secondary-box${canScroll ? ' is-scrollable' : ''}`}>
                        <PeriodLineChart
                          data={sliceChart(siteConsumptionData)}
                          labels={chartLabels}
                          fullLabels={chartFullLabels}
                          color="#60a5fa"
                          unit="L"
                          strokeWidth={3}
                        />
                      </div>
                    </div>
                  </article>

                  <article className="metric-panel site-metric-card">
                    <div className="analysis-indicator-block">
                      <span className="metric-label">Indicateur</span>
                      <h3>Volume stock</h3>
                      <div className="site-metric-stack">
                      <div>
                        <span>Dernière valeur</span>
                        <strong>{siteVolumeStats.latest.toFixed(1)} L</strong>
                        {renderDelta(siteVolumeStats, '', true)}
                      </div>
                      <div>
                        <span>Volume moyen</span>
                        <strong>{siteVolumeStats.mean.toFixed(1)} L</strong>
                        {renderMeanDelta(siteVolumeStats, '', true)}
                      </div>
                      </div>
                    </div>
                    <div className="analysis-chart-block">
                      <span className="curve-title">Courbe volume stock</span>
                      <div className={`chart-box secondary-box${canScroll ? ' is-scrollable' : ''}`}>
                        <PeriodLineChart
                          data={sliceChart(siteVolumeData)}
                          labels={chartLabels}
                          fullLabels={chartFullLabels}
                          color="#0b3d7a"
                          unit="L"
                          strokeWidth={3}
                        />
                      </div>
                    </div>
                  </article>
                </div>
              </section>
            </SiteDetailLayout>
          </main>
        </PageEnter>
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
            <DateRangeFilter
              rapportChoices={availableDateRange
                ? (sitesDashboard?.rapport_choices || [])
                : (sitesDashboard?.rapport_choices || [])}
              dateDebut={dateDebut}
              dateFin={dateFin}
              label="Période"
              onDateDebutChange={(value) => {
                setDateDebut(value)
                const idx = dateToIndex(value)
                if (idx >= 0) setStartIdx(idx)
              }}
              onDateFinChange={(value) => {
                setDateFin(value)
                const idx = dateToIndex(value)
                if (idx >= 0) setEndIdx(idx)
              }}
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
              options={[
                { label: 'Tous les sites', value: '' },
                ...siteOptions.map((site) => ({ label: site.nom_site, value: String(site.id) })),
              ]}
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
          {availableDateRange && availableDateRange.reports_count === 0 && (
            <EmptyState
              icon={<CircleAlert size={40} />}
              title="Aucune donnée disponible"
              description={`La base de données ne contient aucun rapport. Importez des données pour commencer le suivi.`}
              action={{ label: 'Importer un rapport', onClick: () => onNavigate?.({ view: 'reports' }) }}
            />
          )}

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
                    </tr>
                  </thead>
                  <tbody>
                    {siteTableRows.length > 0 ? (
                      siteTableRows.map((site) => {
                        const siteAut = sitesDashboard?.autonomyBySite?.[String(site.id)] || {}
                        const severity = getAutonomySeverity(siteAut)
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
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={5}>
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
          ) : null}
        </main>
      </PageEnter>
    </div>
  )
}

export default SitesPage