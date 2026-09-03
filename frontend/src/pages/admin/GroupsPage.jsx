import React, { useEffect, useMemo, useRef, useState } from 'react'
import Topbar from '@/components/Topbar.jsx'
import WelcomeBanner from '@/components/WelcomeBanner.jsx'
import Button from '@/components/ui/button.jsx'
import { EmptyState } from '@/components/ui/empty-state.jsx'
import { Select } from '@/components/ui/select.jsx'
import { StatusBadge } from '@/components/ui/status-badge.jsx'
import { apiFetch, listAlertes } from '@/auth.js'
import AutonomyBadge from '@/components/AutonomyBadge.jsx'
import PageLoader from '@/components/PageLoader.jsx'
import PageEnter from '@/components/PageEnter.jsx'
import {
  isFiniteNumber,
  buildDerivedMetric,
  buildPeriodSeriesStats,
  buildHourlyRateSeries,
  buildHourlyConsumptionStats,
} from '@/utils/stats.js'
import PeriodLineChart from '@/components/PeriodLineChart.jsx'
import { defaultPeriodIndices, MAX_CHART_WEEKS, toChartLabels, visibleChartRange } from '@/utils/chartAxis.js'
import {
  formatAutonomyValue,
  getAutonomyHint,
  getAutonomySeverity,
  METRIC_LABELS,
} from '@/utils/format.js'
import { formatAlertDateTime, normalizePersistedAlert } from '@/utils/alerts.js'
import { DateRangeFilter } from '@/components/DateRangeFilter.jsx'
import { parseDate } from '@/hooks/useDateFilter.js'

const formatMetric = (value, digits = 1) => (
  isFiniteNumber(value) ? value.toFixed(digits) : '—'
)

const extractPower = (value) => {
  if (value == null || value === '') return 0
  const match = String(value).trim().replace(',', '.').match(/(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : 0
}

/** Autonomie = (volume_CP × proportion + CJ) / conso_horaire_moyenne.
 * Conso sans delta horaire → Indéterminée.
 * Données manquantes / ex-∞ → Sans fonctionnement.
 */
const buildGroupAutonomyEntity = (group) => ({
  ...group,
  autonomie_hours: isFiniteNumber(group.autonomie_hours) ? Number(group.autonomie_hours) : null,
  formatted_autonomy: group.formatted_autonomy ?? null,
  is_infinite_consumption: Boolean(group.is_infinite_consumption),
  is_infinite_autonomy: Boolean(group.is_infinite_autonomy),
  is_sans_fonctionnement: Boolean(group.is_sans_fonctionnement),
  indet_reason: group.indet_reason || null,
})

const safeNum = (value) => (isFiniteNumber(value) ? value : 0)
const renderHourlyMetric = (value, digits = 2) => {
  if (value == null || !Number.isFinite(value)) return '— L/h'
  return `${value.toFixed(digits)} L/h`
}

function GroupsPage({ onNavigate }) {
  const [groupsData, setGroupsData] = useState(null)
  const [groupAlerts, setGroupAlerts] = useState([])
  const [rapportDebut, setRapportDebut] = useState('')
  const [rapportFin, setRapportFin] = useState('')
  // Nouveaux états : dates basées sur les données réelles
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [siteId, setSiteId] = useState('') // Par défaut : chaîne vide = "Tous les sites"
  const [availableSites, setAvailableSites] = useState([]) // Liste des sites depuis l'API
  const queryGroupId = useMemo(() => new URLSearchParams(window.location.search).get('groupId'), [])
  const queryGroupLabel = useMemo(() => new URLSearchParams(window.location.search).get('groupLabel'), [])
  const queryMode = useMemo(() => new URLSearchParams(window.location.search).get('mode'), [])
  // Par défaut : vue globale (tous les groupes, tous les sites) si on arrive sans option
  const [mode, setMode] = useState(queryMode || (queryGroupId ? 'details' : 'all'))
  const [selectedGroupId, setSelectedGroupId] = useState(queryGroupId ? String(queryGroupId) : '')
  const [filtering, setFiltering] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [chartPan, setChartPan] = useState(0)
  const filterSeq = useRef(0)

  /**
   * Convertit une date ISO en identifiant de rapport correspondant.
   * @param {string} dateIso
   * @returns {string}
   */
  const dateToRapportId = (dateIso) => {
    if (!dateIso || !groupsData?.rapport_choices?.length) return ''
    const target = parseDate(dateIso)
    if (!target) return ''
    // Cherche le rapport dont la plage contient cette date
    for (const choice of groupsData.rapport_choices) {
      const start = parseDate(choice.date_debut)
      const end = parseDate(choice.date_fin)
      if (start && end && target >= start && target <= end) {
        return String(choice.id)
      }
    }
    // Si pas trouvé, prendre le rapport le plus proche
    const sorted = [...groupsData.rapport_choices].sort((a, b) => {
      const da = parseDate(a.date_debut)
      const db = parseDate(b.date_debut)
      return Math.abs((da?.getTime() || 0) - target.getTime()) - Math.abs((db?.getTime() || 0) - target.getTime())
    })
    return sorted.length > 0 ? String(sorted[0].id) : ''
  }

  // Regroupement des alertes par groupe
  const alertsByGroupId = useMemo(() => {
    const map = new Map()
    groupAlerts.forEach((alert) => {
      const gid = alert.group_id ?? alert.groupe_id ?? alert.donnees_contexte?.groupe_id
      if (gid == null) return
      const key = String(gid)
      const list = map.get(key) || []
      list.push(alert)
      map.set(key, list)
    })
    return map
  }, [groupAlerts])

  const reportChoices = useMemo(() => {
    if (groupsData?.rapport_choices?.length) return groupsData.rapport_choices
    if (groupsData?.report_choices?.length) return groupsData.report_choices
    if (groupsData?.labels?.length) {
      return groupsData.labels.map((label, idx) => ({ id: idx + 1, label }))
    }
    return []
  }, [groupsData])

  const rapportDebutIndex = useMemo(() => {
    if (!reportChoices.length) return 0
    const selectedId = rapportDebut ? String(rapportDebut) : ''
    const selectedIndex = reportChoices.findIndex((choice) => String(choice.id) === selectedId)
    return selectedIndex >= 0 ? selectedIndex : 0
  }, [rapportDebut, reportChoices])

  const rapportFinIndex = useMemo(() => {
    if (!reportChoices.length) return 0
    const selectedId = rapportFin ? String(rapportFin) : ''
    const selectedIndex = reportChoices.findIndex((choice) => String(choice.id) === selectedId)
    return selectedIndex >= 0 ? selectedIndex : reportChoices.length - 1
  }, [rapportFin, reportChoices])

  const startIndex = Math.min(rapportDebutIndex, rapportFinIndex)
  const endIndex = Math.max(rapportDebutIndex, rapportFinIndex)
  const chartWindow = useMemo(
    () => visibleChartRange(startIndex, endIndex, chartPan),
    [startIndex, endIndex, chartPan],
  )
  const { viewStart, viewEnd, maxPan, canScroll } = chartWindow
  const chartLabels = useMemo(
    () => toChartLabels((groupsData?.labels || []).slice(viewStart, viewEnd + 1)),
    [groupsData, viewStart, viewEnd],
  )
  const chartFullLabels = useMemo(
    () => (groupsData?.labels || []).slice(viewStart, viewEnd + 1),
    [groupsData, viewStart, viewEnd],
  )
  const sliceChart = (values = []) => (values || []).slice(viewStart, viewEnd + 1)

  useEffect(() => {
    setChartPan(Math.max(0, endIndex - startIndex + 1 - MAX_CHART_WEEKS))
  }, [startIndex, endIndex])

  const loadGroupsData = async (queryParams = '', options = {}) => {
    const seq = ++filterSeq.current
    try {
      if (options.isFilter) setFiltering(true)
      const data = await apiFetch(`/api/dashboard/groupes${queryParams ? `?${queryParams}` : ''}`)
      if (seq !== filterSeq.current) return
      const choices = data.rapport_choices || data.report_choices || []
      const rawBlocks = data.group_blocks || data.groups || []
      const normalizedBlocks = rawBlocks.map((block) => ({
        ...block,
        hours: buildDerivedMetric(block.hours_run || []),
        consumption_stats: buildDerivedMetric(block.consumption || []),
        volume_stats: buildDerivedMetric(block.volume || []),
        rate: block.mean_hourly_consumption_deduite != null ? block.mean_hourly_consumption_deduite : null,
      }))

      setGroupsData({
        ...data,
        group_blocks: normalizedBlocks,
        groups: normalizedBlocks,
      })
      if (!options.preservePeriod) {
        const { first, last } = defaultPeriodIndices(choices.length)
        setRapportDebut(String(choices[first]?.id ?? ''))
        setRapportFin(String(choices[last]?.id ?? ''))
        // Initialiser les dates basées sur les données réelles
        if (data.rapport_choices?.length > 0) {
          const sorted = [...data.rapport_choices].sort((a, b) => {
            const da = a.date_debut ? new Date(a.date_debut).getTime() : 0
            const db = b.date_debut ? new Date(b.date_debut).getTime() : 0
            return da - db
          })
          if (sorted.length > 0) {
            setDateDebut(sorted[0].date_debut || '')
            setDateFin(sorted[sorted.length - 1].date_fin || '')
          }
        }
      }
      if (!options.preserveSiteSelection) {
        const nextSite = data.selected_site_id != null ? String(data.selected_site_id) : ''
        setSiteId(nextSite)
      }
    } catch (error) {
      console.warn('Groups backend unavailable:', error)
    } finally {
      if (seq === filterSeq.current) {
        setFiltering(false)
        setInitialLoading(false)
      }
    }
  }

  // Charger les dates min/max disponibles depuis l'API
  useEffect(() => {
    const loadDateRange = async () => {
      try {
        const rangeData = await apiFetch('/api/sites/date-range')
        if (rangeData && (rangeData.min_date || rangeData.max_date)) {
          if (rangeData.max_date) {
            const maxDate = new Date(rangeData.max_date)
            const thirtyDaysAgo = new Date(maxDate)
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
            
            if (!dateFin) {
              setDateFin(rangeData.max_date)
            }
            if (!dateDebut) {
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
        }
      } catch (err) {
        console.warn('Impossible de charger la plage de dates:', err)
      }
    }
    loadDateRange()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Charger la liste des sites depuis l'API pour le filtre dynamique
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
    loadGroupsData()
    listAlertes({ etat: 'actives' })
      .then((rows) => {
        const list = (Array.isArray(rows) ? rows : [])
          .map(normalizePersistedAlert)
          .filter(Boolean)
          .filter((a) => !a.traitee)
        setGroupAlerts(list)
      })
      .catch(() => setGroupAlerts([]))
  }, [])

  const runFilters = async (next = {}) => {
    if (next.rapportDebut != null) setRapportDebut(next.rapportDebut)
    if (next.rapportFin != null) setRapportFin(next.rapportFin)
    if (next.dateDebut != null) setDateDebut(next.dateDebut)
    if (next.dateFin != null) setDateFin(next.dateFin)
    if (next.siteId === undefined) return
    const site = next.siteId
    setSiteId(site)
    const params = new URLSearchParams()
    if (site) params.set('site_id', site)
    await loadGroupsData(params.toString(), {
      preserveSiteSelection: true,
      preservePeriod: true,
      isFilter: true,
    })
  }

  useEffect(() => {
    if (mode === 'all') return undefined
    const onWheel = (event) => {
      if (!canScroll) return
      event.preventDefault()
      const step = event.deltaY > 0 ? 1 : -1
      setChartPan((prev) => Math.min(maxPan, Math.max(0, prev + step)))
    }
    const chartBoxes = document.querySelectorAll('.group-card .chart-box')
    chartBoxes.forEach((box) => box.addEventListener('wheel', onWheel, { passive: false }))
    return () => {
      chartBoxes.forEach((box) => box.removeEventListener('wheel', onWheel))
    }
  }, [mode, canScroll, maxPan, viewStart, viewEnd])

  const selectedSite = groupsData?.sites?.find((site) => String(site.id) === String(siteId)) ?? groupsData?.sites?.[0]

  const siteBlockStats = useMemo(() => {
    const filtered = (groupsData?.group_blocks || []).filter(
      (block) => !siteId || String(block.site_id) === String(siteId),
    )
    const seriesLen = (groupsData?.labels || []).length
    const hoursAgg = Array.from({ length: seriesLen }, () => 0)
    const consAgg = Array.from({ length: seriesLen }, () => 0)

    filtered.forEach((block) => {
      ;(block.hours_run || []).forEach((value, index) => {
        if (index < seriesLen) hoursAgg[index] += safeNum(value)
      })
      ;(block.consumption || []).forEach((value, index) => {
        if (index < seriesLen) consAgg[index] += safeNum(value)
      })
    })

    const hoursWindow = hoursAgg.slice(startIndex, endIndex + 1)
    const consWindow = consAgg.slice(startIndex, endIndex + 1)
    return {
      hourly: buildHourlyConsumptionStats(hoursWindow, consWindow),
      consumption: buildPeriodSeriesStats(consWindow),
      hours: buildPeriodSeriesStats(hoursWindow),
    }
  }, [groupsData, siteId, startIndex, endIndex])

  const openGroupDetails = (group) => {
    setSelectedGroupId(String(group.id))
    setMode('details')
    onNavigate?.({
      view: 'groups',
      groupId: group.id,
      groupLabel: group.label,
      mode: 'details',
    })
  }

  if (initialLoading || !groupsData) {
    return (
      <div className="app-shell dashboard-shell">
        <Topbar activeView="groups" onNavigate={onNavigate} />
        <PageLoader label="Analyse des groupes électrogènes…" />
      </div>
    )
  }

  return (
    <div className="app-shell dashboard-shell">
      <Topbar activeView="groups" onNavigate={onNavigate} />

      {filtering && (
        <div className="cf-filter-overlay" role="status" aria-live="polite">
          <PageLoader fullscreen={false} label="Application du filtre…" />
        </div>
      )}

      <PageEnter>
        <main className={`page-layout groups-grid ${filtering ? 'is-filtering' : ''}`}>
          <WelcomeBanner
            kicker="Machines & consommation"
            title="Groupes électrogènes"
            subtitle="Heures, conso et écarts — affinez avec les filtres si besoin."
          />

          <form className="groups-filter-bar" onSubmit={(event) => event.preventDefault()}>
            <DateRangeFilter
              rapportChoices={groupsData.rapport_choices || []}
              dateDebut={dateDebut}
              dateFin={dateFin}
              disabled={filtering}
              label="Relevé"
              onDateDebutChange={(value) => {
                setDateDebut(value)
                const rapportId = dateToRapportId(value)
                if (rapportId) setRapportDebut(rapportId)
              }}
              onDateFinChange={(value) => {
                setDateFin(value)
                const rapportId = dateToRapportId(value)
                if (rapportId) setRapportFin(rapportId)
              }}
            />
            <Select
              label="Site"
              id="site_id"
              value={siteId}
              disabled={filtering}
              onChange={(event) => runFilters({ siteId: event.target.value })}
              options={[
                { label: 'Tous les sites', value: '' },
                ...((availableSites.length > 0
                  ? availableSites
                  : (groupsData.sites || [])
                ).map((site) => ({ label: site.nom_site, value: String(site.id) }))),
              ]}
            />
            <Select
              label="Affichage"
              id="view_mode"
              value={mode}
              disabled={filtering}
              onChange={(event) => {
                const next = event.target.value
                setMode(next)
                if (next === 'all') setSelectedGroupId('')
              }}
              options={[
                { label: 'Vue d’ensemble', value: 'all' },
                { label: 'Détail', value: 'details' },
              ]}
            />
          </form>
          {dateDebut && dateFin && (
            <p className="group-block-note">
              <span className="date-filter-info">Données réelles</span>
              Période sélectionnée : du <strong>{parseDate(dateDebut)?.toLocaleDateString('fr-FR') || '—'}</strong> au <strong>{parseDate(dateFin)?.toLocaleDateString('fr-FR') || '—'}</strong>
            </p>
          )}

          {(mode !== 'all' && siteId) && (
            <section className="metric-section">
              <div className="section-title-wrap">
                <span className="metric-label">Synthèse du site</span>
                <h2>{selectedSite?.nom_site || 'Site'}</h2>
              </div>
              <div className="summary-strip">
                <div className="summary-chip">
                  <span>Consommation horaire moyenne</span>
                  <strong>{formatMetric(siteBlockStats.hourly.mean, 2)} L/h</strong>
                </div>
                <div className="summary-chip">
                  <span>Consommation moyenne N</span>
                  <strong>{formatMetric(siteBlockStats.consumption.weekN)} L</strong>
                </div>
                <div className="summary-chip">
                  <span>Consommation moyenne N-1</span>
                  <strong>{formatMetric(siteBlockStats.consumption.weekN1)} L</strong>
                </div>
                <div className="summary-chip">
                  <span>Delta horaire semaine N</span>
                  <strong>{formatMetric(siteBlockStats.hours.weekN)} h</strong>
                </div>
              </div>
            </section>
          )}

          <section className="groups-list">
            {mode === 'all' ? (
              <section className="site-overview">
                <div className="section-title-wrap">
                  <span className="metric-label">Vue d’ensemble</span>
                  <h2>Tous les groupes électrogènes</h2>
                </div>
                <div className="dashboard-table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Groupe</th>
                        <th>Site</th>
                        <th>Alertes</th>
                        <th>{METRIC_LABELS.consumptionWeekN}</th>
                        <th>{METRIC_LABELS.consumptionWeekN1}</th>
                        <th>{METRIC_LABELS.consumptionMean}</th>
                        <th>{METRIC_LABELS.hoursDeltaWeekN}</th>
                        <th>{METRIC_LABELS.autonomyRemaining}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(groupsData.group_blocks || []).length > 0 ? (
                        (groupsData.group_blocks || []).map((g) => {
                          const siteName = g.site_nom || g.nom_site || g.site_name || (groupsData.sites || []).find((s) => String(s.id) === String(g.site_id))?.nom_site || ''
                          const hoursWindow = (g.hours_run || []).slice(startIndex, endIndex + 1)
                          const consWindow = (g.consumption || []).slice(startIndex, endIndex + 1)
                          const consumption = buildPeriodSeriesStats(consWindow)
                          const hours = buildPeriodSeriesStats(hoursWindow)
                          const autonomyEntity = buildGroupAutonomyEntity(g)
                          const severity = getAutonomySeverity(autonomyEntity)
                          const relatedAlerts = alertsByGroupId.get(String(g.id)) || []
                          return (
                            <tr
                              key={g.id}
                              className={`autonomy-row autonomy-row--${severity} dashboard-row-link`}
                              onClick={() => openGroupDetails(g)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault()
                                  openGroupDetails(g)
                                }
                              }}
                              tabIndex={0}
                              role="link"
                              aria-label={`Ouvrir le détail du groupe ${g.label}`}
                            >
                              <td>{g.label}</td>
                              <td>{siteName}</td>
                              <td>
                                {relatedAlerts.length ? (
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="group-alert-chip"
                                    title={relatedAlerts.map((a) => a.title).join(' · ')}
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      onNavigate?.({
                                        view: 'alerts',
                                        groupId: g.id,
                                        groupLabel: g.label,
                                      })
                                    }}
                                  >
                                    {relatedAlerts.length} alerte{relatedAlerts.length > 1 ? 's' : ''}
                                  </Button>
                                ) : (
                                  <span className="group-alert-none">—</span>
                                )}
                              </td>
                              <td>{formatMetric(consumption.weekN)}</td>
                              <td>{formatMetric(consumption.weekN1)}</td>
                              <td>{formatMetric(consumption.mean)}</td>
                              <td>{formatMetric(hours.weekN)}</td>
                              <td>
                                <AutonomyBadge entity={autonomyEntity} size="sm" />
                              </td>
                            </tr>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan={8}>
                            <EmptyState
                              icon={<div className="text-muted">⚙️</div>}
                              title="Aucun groupe électrogène"
                              description="Aucune machine n'est actuellement enregistrée dans le système."
                            />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : (
              (groupsData.group_blocks || []).filter((group) => {
                if (selectedGroupId) return String(group.id) === String(selectedGroupId)
                if (queryGroupId) return String(group.id) === String(queryGroupId)
                if (queryGroupLabel) return String(group.label) === String(queryGroupLabel)
                return true
              }).map((group) => (
                <article key={group.id} className="group-card" style={{ borderLeft: `4px solid ${group.color || '#0b3d7a'}` }}>
                  {(() => {
                    const hoursWindow = (group.hours_run || []).slice(startIndex, endIndex + 1)
                    const consumptionWindow = (group.consumption || []).slice(startIndex, endIndex + 1)
                    const autonomyEntity = buildGroupAutonomyEntity(group)
                    const severity = getAutonomySeverity(autonomyEntity)
                    const relatedAlerts = alertsByGroupId.get(String(group.id)) || []
                    const hourly = buildHourlyRateSeries(
                      sliceChart(group.hours_run || []),
                      sliceChart(group.consumption || []),
                    )

                    return (
                      <>
                        {/* Bloc autonomie */}
                        <div className={`group-autonomy-hero group-autonomy-hero--${severity}`}>
                          <div className="group-autonomy-hero-copy">
                            <span className="group-autonomy-hero-kicker">Temps restant</span>
                            <p className="group-autonomy-hero-hint">
                              {getAutonomyHint(autonomyEntity)}
                            </p>
                          </div>
                          <div className="group-autonomy-hero-value-wrap">
                            <AutonomyBadge entity={autonomyEntity} size="lg" />
                          </div>
                        </div>

                        {/* Alertes liées — en haut de la fiche détail */}
                        {relatedAlerts.length > 0 && (
                          <div className="group-related-alerts" role="region" aria-label="Alertes du groupe">
                            <h4 className="group-related-alerts-title">Alertes liées · {relatedAlerts.length}</h4>
                            <ul>
                              {relatedAlerts.map((alert) => {
                                const severityClass = alert.severity || 'medium'
                                return (
                                  <li key={alert.id} className="group-related-alert-item">
                                    <span
                                      className={`group-related-alert-dot group-related-alert-dot--${severityClass}`}
                                      aria-hidden="true"
                                    />
                                    <span className="group-related-alert-date">
                                      {formatWhen(alert.detected_at)}
                                    </span>
                                    <span className="group-related-alert-title">{alert.title}</span>
                                    {alert.essential ? (
                                      <span className="group-related-alert-value">
                                        {alert.essential}
                                      </span>
                                    ) : null}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="group-related-alert-link"
                                      onClick={() => onNavigate?.({
                                        view: 'alerts',
                                        alertId: alert.id,
                                        groupId: group.id,
                                      })}
                                    >
                                      Voir →
                                    </Button>
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        )}

                        {/* En-tête du groupe */}
                        <div className="group-card-head">
                          <span className="metric-label">Groupe</span>
                          <h3>{group.label}</h3>
                          {(group.site_nom || selectedSite?.nom_site) ? (
                            <p className="group-header-meta">{group.site_nom || selectedSite?.nom_site}</p>
                          ) : null}
                          {group.latest_main_volume != null && (
                            <p className="group-header-meta">Cuve principale : {group.latest_main_volume} litres</p>
                          )}
                          {group.latest_daily_volume != null && (
                            <p className="group-header-meta">Cuve journalière : {group.latest_daily_volume} litres</p>
                          )}
                        </div>

                        {/* Bloc métriques */}
                        <div className="group-metric-grid">
                          {(() => {
                            const hoursWindow = (group.hours_run || []).slice(startIndex, endIndex + 1)
                            const consumptionWindow = (group.consumption || []).slice(startIndex, endIndex + 1)
                            const hourlyStats = buildHourlyConsumptionStats(hoursWindow, consumptionWindow)
                            const consumptionStats = buildPeriodSeriesStats(consumptionWindow, { excludeZeroValues: true })
                            const hoursStats = buildPeriodSeriesStats(hoursWindow)
                            return (
                              <>
                                <div className="metric-stat-block">
                                  <span className="curve-title">Delta horaire</span>
                                  <div className="group-stats">
                                    <div>
                                      <span>Delta horaire dernière semaine (semaine N)</span>
                                      <strong>{formatMetric(hoursStats.weekN)} h</strong>
                                    </div>
                                    <div>
                                      <span>Delta horaire avant-dernière semaine (semaine N-1)</span>
                                      <strong>{formatMetric(hoursStats.weekN1)} h</strong>
                                    </div>
                                    <div>
                                      <span>Delta horaire total sur la période de la courbe</span>
                                      <strong>{formatMetric(hoursStats.total)} h</strong>
                                    </div>
                                    <div>
                                      <span>Delta horaire moyen</span>
                                      <strong>{formatMetric(hoursStats.mean)} h</strong>
                                    </div>
                                  </div>
                                </div>

                                <div className="metric-stat-block">
                                  <span className="curve-title">Consommation</span>
                                  <div className="group-stats">
                                    <div>
                                      <span>Consommation dernière semaine (semaine N)</span>
                                      <strong>{formatMetric(consumptionStats.weekN)} L</strong>
                                    </div>
                                    <div>
                                      <span>Consommation avant-dernière semaine (semaine N-1)</span>
                                      <strong>{formatMetric(consumptionStats.weekN1)} L</strong>
                                    </div>
                                    <div>
                                      <span>Consommation totale sur la période de la courbe</span>
                                      <strong>{formatMetric(consumptionStats.total)} L</strong>
                                    </div>
                                    <div>
                                      <span>Consommation moyenne (null exclus)</span>
                                      <strong>{formatMetric(consumptionStats.mean)} L</strong>
                                    </div>
                                  </div>
                                </div>

                                <div className="metric-stat-block">
                                  <span className="curve-title">Consommation horaire</span>
                                  {hourlyStats.noData ? (
                                    <div className="group-stats">
                                      <div>
                                        <span>Consommation horaire moyenne</span>
                                        <strong>— L/h</strong>
                                      </div>
                                      <div>
                                        <span>Consommation horaire max</span>
                                        <strong>— L/h</strong>
                                      </div>
                                      <div>
                                        <span>Consommation horaire min</span>
                                        <strong>— L/h</strong>
                                      </div>
                                      <div>
                                        <span>Écart-type</span>
                                        <strong>— L/h</strong>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="group-stats">
                                      <div>
                                        <span>Consommation horaire moyenne</span>
                                        <strong>{renderHourlyMetric(hourlyStats.mean, 2)}</strong>
                                      </div>
                                      <div>
                                        <span>Consommation horaire max</span>
                                        <strong>{renderHourlyMetric(hourlyStats.max, 2)}</strong>
                                      </div>
                                      <div>
                                        <span>Consommation horaire min</span>
                                        <strong>{renderHourlyMetric(hourlyStats.min, 2)}</strong>
                                      </div>
                                      <div>
                                        <span>Écart-type</span>
                                        <strong>{renderHourlyMetric(hourlyStats.stddev, 2)}</strong>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </>
                            )
                          })()}
                        </div>

                        {/* Graphiques */}
                        <div className="group-curve-grid">
                          <div className="chart-card">
                            <span className="curve-title">Courbe delta horaire</span>
                            <div className={`chart-box small-box${canScroll ? ' is-scrollable' : ''}`}>
                              <PeriodLineChart
                                data={sliceChart(group.hours_run || [])}
                                labels={chartLabels}
                                fullLabels={chartFullLabels}
                                color={group.color || '#0b3d7a'}
                                unit="h"
                                yBeginZero
                              />
                            </div>
                          </div>
                          <div className="chart-card">
                            <span className="curve-title">Courbe consommation</span>
                            <div className={`chart-box small-box${canScroll ? ' is-scrollable' : ''}`}>
                              <PeriodLineChart
                                data={sliceChart(group.consumption || [])}
                                labels={chartLabels}
                                fullLabels={chartFullLabels}
                                color={group.color || '#0b3d7a'}
                                unit="L"
                                yBeginZero
                              />
                            </div>
                          </div>
                          <div className="chart-card">
                            <span className="curve-title">Courbe consommation horaire</span>
                            <div className={`chart-box small-box${canScroll ? ' is-scrollable' : ''}`}>
                              <PeriodLineChart
                                data={hourly.data}
                                labels={chartLabels}
                                fullLabels={chartFullLabels}
                                color={group.color || '#0b3d7a'}
                                unit="L/h"
                                yBeginZero
                                suggestedMax={hourly.suggestedMax}
                                pointKinds={hourly.kinds}
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </article>
              ))
            )}
          </section>
        </main>
      </PageEnter>
    </div>
  )
}

// Fonction utilitaire pour le formatage de date (identique à celle utilisée dans AlertsPage)
function formatWhen(value) {
  return formatAlertDateTime(value)
}

export default GroupsPage