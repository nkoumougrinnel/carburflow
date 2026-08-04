import React, { useEffect, useMemo, useRef, useState } from 'react'
import Topbar from '../components/Topbar.jsx'
import WelcomeBanner from '../components/WelcomeBanner.jsx'
import { apiFetch, listAlertes } from '../auth.js'
import AutonomyBadge from '../components/AutonomyBadge.jsx'
import PageLoader from '../components/PageLoader.jsx'
import PageEnter from '../components/PageEnter.jsx'
import { useChartPalette } from '../hooks/useChartPalette.js'
import { createChart, defaultPeriodIndices, MAX_CHART_WEEKS, seriesPointRadius, toChartLabels, visibleChartRange, xAxisTicks } from '../utils/chartAxis.js'
import {
  formatAutonomyValue,
  getAutonomyHint,
  getAutonomySeverity,
  getAutonomySeverityLabel,
  METRIC_LABELS,
} from '../utils/format.js'
import { normalizePersistedAlert } from '../utils/alerts.js'

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value)

const lastFinite = (values = []) => {
  for (let i = values.length - 1; i >= 0; i -= 1) {
    if (isFiniteNumber(values[i])) return values[i]
  }
  return null
}

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


const buildDerivedMetric = (values = []) => {
  // Ignore uniquement les null/absents — les 0 entrent dans la moyenne
  const normalizedValues = (values || []).filter(isFiniteNumber)
  if (!normalizedValues.length) {
    return {
      total: 0,
      mean: 0,
      all_time_mean: 0,
      all_time_stddev: 0,
      variation_pct: null,
      mean_variation_pct: null,
      has_previous_period: false,
    }
  }

  const total = normalizedValues.reduce((sum, value) => sum + value, 0)
  const mean = total / normalizedValues.length
  const firstValue = normalizedValues[0]
  const variationPct = firstValue === 0 ? null : ((normalizedValues[normalizedValues.length - 1] - firstValue) / firstValue) * 100
  const meanVariationPct = firstValue === 0 ? null : ((mean - firstValue) / firstValue) * 100
  const variance = normalizedValues.reduce((sum, value) => sum + (value - mean) ** 2, 0) / normalizedValues.length

  return {
    total: Number(total.toFixed(1)),
    mean: Number(mean.toFixed(1)),
    all_time_mean: Number(mean.toFixed(1)),
    all_time_stddev: Number(Math.sqrt(variance).toFixed(1)),
    variation_pct: variationPct === null ? null : Number(variationPct.toFixed(1)),
    mean_variation_pct: meanVariationPct === null ? null : Number(meanVariationPct.toFixed(1)),
    has_previous_period: normalizedValues.length > 1,
  }
}

const safeNum = (value) => (isFiniteNumber(value) ? value : 0)

/** Stats sur une série (semaine N / N-1 / total / moyenne).
 * Ignore les null (pas de relevé) — les 0 entrent dans la moyenne.
 */
const buildPeriodSeriesStats = (values = [], options = {}) => {
  const series = values || []
  if (!series.length) {
    return { weekN: null, weekN1: null, total: null, mean: null }
  }
  const finite = series.filter(isFiniteNumber)
  const excludeZeroValues = options.excludeZeroValues === true
  const meaningful = excludeZeroValues ? finite.filter((value) => value > 0) : finite
  const total = finite.reduce((sum, value) => sum + value, 0)
  const weekN = lastFinite(series)
  let weekN1 = null
  if (series.length > 1) {
    for (let i = series.length - 2; i >= 0; i -= 1) {
      if (isFiniteNumber(series[i])) {
        weekN1 = series[i]
        break
      }
    }
  }
  return {
    weekN,
    weekN1,
    total: finite.length ? total : null,
    mean: meaningful.length ? totalOf(meaningful) / meaningful.length : null,
  }
}

const totalOf = (values = []) => values.reduce((sum, value) => sum + value, 0)

/**
 * Série L/h pour la courbe :
 * - zero     : conso = 0 & heures > 0 → 0 L/h (point normal sur la courbe)
 * - infinite : conso > 0 & heures = 0 → ∞ (marqueur en haut d’échelle)
 * - missing  : pas de relevé (null) → trou
 * Toute date avec heures + conso numériques est affichée (y compris 0h/0L → 0).
 */
const buildHourlyRateSeries = (hours = [], consumption = []) => {
  const len = Math.max(hours.length, consumption.length)
  const kinds = []
  const raw = []

  for (let index = 0; index < len; index += 1) {
    const hoursValue = hours[index]
    const consumptionValue = consumption[index]
    if (!isFiniteNumber(hoursValue) || !isFiniteNumber(consumptionValue)) {
      kinds.push('missing')
      raw.push(null)
      continue
    }
    if (hoursValue > 0 && consumptionValue === 0) {
      kinds.push('zero')
      raw.push(0)
      continue
    }
    if (hoursValue === 0 && consumptionValue > 0) {
      kinds.push('infinite')
      raw.push(Infinity)
      continue
    }
    if (hoursValue > 0) {
      kinds.push('normal')
      raw.push(Number((consumptionValue / hoursValue).toFixed(2)))
      continue
    }
    // 0 h et 0 L : point à 0 pour garder toutes les dates visibles
    kinds.push('zero')
    raw.push(0)
  }

  const finitePositive = raw.filter((value) => isFiniteNumber(value) && value > 0)
  const finiteAll = raw.filter((value) => isFiniteNumber(value))
  const hasInfinite = raw.some((value) => value === Infinity)
  const baseMax = finitePositive.length
    ? Math.max(...finitePositive)
    : (finiteAll.length ? Math.max(...finiteAll, 1) : 1)
  const infinityDisplay = Number((Math.max(baseMax * 1.35, 1)).toFixed(2))
  const suggestedMax = hasInfinite
    ? infinityDisplay
    : (finiteAll.length ? Math.max(...finiteAll, 0) * 1.1 || 1 : 1)

  const data = raw.map((value) => (value === Infinity ? infinityDisplay : value))

  return {
    data,
    kinds,
    infinityDisplay,
    suggestedMax,
    hasZero: kinds.includes('zero'),
    hasInfinite,
  }
}

/**
 * Métriques L/h : uniquement sur les taux d'heures de fonctionnement (> 0 L/h).
 * Exclus : 0 L/h (sans fonctionnement), ∞ et absents.
 */
const buildHourlyConsumptionStats = (hours = [], consumption = []) => {
  const series = buildHourlyRateSeries(hours, consumption)
  const rates = series.data
    .map((value, index) => {
      const kind = series.kinds[index]
      if (kind === 'normal' && isFiniteNumber(value) && value > 0) return value
      return null
    })
    .filter(isFiniteNumber)

  if (!rates.length) {
    return {
      mean: null,
      max: null,
      min: null,
      stddev: null,
      noData: true,
      zeroCount: series.kinds.filter((k) => k === 'zero').length,
      infiniteCount: series.kinds.filter((k) => k === 'infinite').length,
    }
  }

  const mean = rates.reduce((sum, value) => sum + value, 0) / rates.length
  const variance = rates.reduce((sum, value) => sum + (value - mean) ** 2, 0) / rates.length

  return {
    mean,
    max: Math.max(...rates),
    min: Math.min(...rates),
    stddev: Math.sqrt(variance),
    noData: false,
    zeroCount: series.kinds.filter((k) => k === 'zero').length,
    infiniteCount: series.kinds.filter((k) => k === 'infinite').length,
  }
}

const renderHourlyMetric = (value, digits = 2) => {
  if (value == null || !Number.isFinite(value)) return '— L/h'
  return `${value.toFixed(digits)} L/h`
}

function GroupsPage({ onNavigate }) {
  const chartPalette = useChartPalette()
  const [groupsData, setGroupsData] = useState(null)
  const [groupAlerts, setGroupAlerts] = useState([])
  const [rapportDebut, setRapportDebut] = useState('')
  const [rapportFin, setRapportFin] = useState('')
  const [siteId, setSiteId] = useState('')
  const queryGroupId = useMemo(() => new URLSearchParams(window.location.search).get('groupId'), [])
  const queryGroupLabel = useMemo(() => new URLSearchParams(window.location.search).get('groupLabel'), [])
  const queryMode = useMemo(() => new URLSearchParams(window.location.search).get('mode'), [])
  // Par défaut : vue globale (tous les groupes, tous les sites) si on arrive sans
  // option (pas de groupId dans l'URL). Si on arrive via un lien qui cible un
  // groupe précis (queryGroupId présent, ex. depuis une alerte du Dashboard), on
  // garde le comportement existant : vue détail sur ce groupe.
  const [mode, setMode] = useState(queryMode || (queryGroupId ? 'details' : 'all'))
  const [selectedGroupId, setSelectedGroupId] = useState(queryGroupId ? String(queryGroupId) : '')
  const [filtering, setFiltering] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [chartPan, setChartPan] = useState(0)
  const filterSeq = useRef(0)

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

  const reportChoices = useMemo(() => (groupsData?.rapport_choices || groupsData?.report_choices || []), [groupsData])
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

  useEffect(() => {
    // Afficher les 4 semaines les plus récentes de la période sélectionnée
    setChartPan(Math.max(0, endIndex - startIndex + 1 - MAX_CHART_WEEKS))
  }, [startIndex, endIndex])

  const loadGroupsData = async (queryParams = '', options = {}) => {
    const seq = ++filterSeq.current
    try {
      if (options.isFilter) setFiltering(true)
      const data = await apiFetch(`/api/dashboard/groupes${queryParams ? `?${queryParams}` : ''}`)
      if (seq !== filterSeq.current) return
      const choices = data.rapport_choices || data.report_choices || []
      const normalizedBlocks = (data.group_blocks || []).map((block) => ({
        ...block,
        hours: buildDerivedMetric(block.hours_run || []),
        consumption_stats: buildDerivedMetric(block.consumption || []),
        volume_stats: buildDerivedMetric(block.volume || []),
        rate: block.mean_hourly_consumption_deduite != null ? block.mean_hourly_consumption_deduite : null,
      }))

      setGroupsData({
        ...data,
        group_blocks: normalizedBlocks,
      })
      // L’API Groupes ignore rapport_debut/fin : période client = 4 dernières semaines par défaut
      if (!options.preservePeriod) {
        const { first, last } = defaultPeriodIndices(choices.length)
        setRapportDebut(String(choices[first]?.id ?? ''))
        setRapportFin(String(choices[last]?.id ?? ''))
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

  useEffect(() => {
    // Premier chargement : tous les groupes / tous les sites
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
    // Période = filtre client uniquement (l’API Groupes ne la gère pas)
    if (next.rapportDebut != null) setRapportDebut(next.rapportDebut)
    if (next.rapportFin != null) setRapportFin(next.rapportFin)

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
    if (!window.Chart || !groupsData || mode === 'all') return undefined
    const charts = []
    const fullLabels = groupsData.labels || []
    const labels = toChartLabels(fullLabels.slice(viewStart, viewEnd + 1))
    const fullLabelsWindow = fullLabels.slice(viewStart, viewEnd + 1)
    const sliceSeries = (values = []) => (values || []).slice(viewStart, viewEnd + 1)
    const baseOptions = (unit, beginZero = false, suggestedMax = undefined) => ({
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
            label: (context) => {
              const y = context.parsed?.y
              const kind = context.dataset?.pointKinds?.[context.dataIndex]
              if (kind === 'infinite') return ' ∞ L/h (conso sans heures)'
              if (y == null || !Number.isFinite(y)) return ' —'
              return ` ${y.toLocaleString('fr-FR')} ${unit}`
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
          beginAtZero: beginZero,
          suggestedMax,
          ticks: {
            color: chartPalette.text,
            callback: (value) => `${value.toLocaleString('fr-FR')} ${unit}`,
          },
          grid: { color: chartPalette.grid },
        },
      },
    })

    const pointRadius = seriesPointRadius(labels.length)

    groupsData.group_blocks?.forEach((block) => {
      const makeChart = (elementId, data, fill, label, color, unit = 'h') => {
        const target = document.getElementById(elementId)
        if (!target) return
        const chart = createChart(target, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label,
              data: sliceSeries(data),
              borderColor: color,
              backgroundColor: `${color}20`,
              borderWidth: 2,
              tension: 0.35,
              fill,
              pointRadius,
              spanGaps: true,
            }],
          },
          options: baseOptions(unit, true),
        })
        if (chart) charts.push(chart)
      }

      makeChart(`chart-group-${block.id}-hours`, block.hours_run || [], true, block.label, block.color || '#0b3d7a', 'h')
      makeChart(`chart-group-${block.id}-consumption`, block.consumption || [], true, 'Consommation', block.color || '#0b3d7a', 'L')

      const hourlyTarget = document.getElementById(`chart-group-${block.id}-hourly-consumption`)
      if (hourlyTarget) {
        const color = block.color || '#0b3d7a'
        const hourlySeries = buildHourlyRateSeries(
          sliceSeries(block.hours_run || []),
          sliceSeries(block.consumption || []),
        )
        const slicedData = hourlySeries.data
        const slicedKinds = hourlySeries.kinds
        const pointBackgroundColor = slicedKinds.map((kind) => {
          if (kind === 'infinite') return '#b91c1c'
          if (kind === 'missing') return 'transparent'
          return color
        })
        const pointBorderColor = slicedKinds.map((kind) => {
          if (kind === 'infinite') return '#7f1d1d'
          if (kind === 'missing') return 'transparent'
          return color
        })
        const pointRadiusPts = slicedKinds.map((kind) => {
          if (kind === 'missing') return 0
          if (kind === 'infinite') return 7
          return seriesPointRadius(labels.length)
        })
        const pointStyle = slicedKinds.map((kind) => (
          kind === 'infinite' ? 'triangle' : 'circle'
        ))

        const hourlyOptions = baseOptions('L/h', true, hourlySeries.suggestedMax)
        const chart = createChart(hourlyTarget, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: 'Consommation horaire',
              data: slicedData,
              borderColor: color,
              backgroundColor: `${color}20`,
              borderWidth: 2,
              tension: 0.35,
              fill: true,
              spanGaps: true,
              pointKinds: slicedKinds,
              pointBackgroundColor,
              pointBorderColor,
              pointRadius: pointRadiusPts,
              pointHoverRadius: pointRadiusPts.map((radius) => Math.max(radius, 4) + 2),
              pointStyle,
              pointBorderWidth: 2,
            }],
          },
          options: hourlyOptions,
          plugins: [{
            id: `hourly-infinite-labels-${block.id}`,
            afterDatasetsDraw(chartInstance) {
              const { ctx } = chartInstance
              const meta = chartInstance.getDatasetMeta(0)
              if (!meta?.data) return
              ctx.save()
              ctx.font = 'bold 11px sans-serif'
              ctx.fillStyle = '#b91c1c'
              ctx.textAlign = 'center'
              meta.data.forEach((point, index) => {
                if (slicedKinds[index] !== 'infinite' || !point) return
                const { x, y } = point.getProps(['x', 'y'], true)
                if (!Number.isFinite(x) || !Number.isFinite(y)) return
                ctx.fillText('∞', x, y - 12)
              })
              ctx.restore()
            },
          }],
        })
        if (chart) charts.push(chart)
      }
    })

    const onWheel = (event) => {
      if (!canScroll) return
      event.preventDefault()
      const step = event.deltaY > 0 ? 1 : -1
      setChartPan((prev) => Math.min(maxPan, Math.max(0, prev + step)))
    }
    const chartBoxes = document.querySelectorAll('.group-card .chart-box')
    chartBoxes.forEach((box) => box.addEventListener('wheel', onWheel, { passive: false }))

    return () => {
      charts.forEach((chart) => chart.destroy())
      chartBoxes.forEach((box) => box.removeEventListener('wheel', onWheel))
    }
  }, [chartPalette, groupsData, viewStart, viewEnd, mode, canScroll, maxPan])

  const selectedSite = groupsData?.sites?.find((site) => String(site.id) === String(siteId)) ?? groupsData?.sites?.[0]

  /** Agrégats site alignés sur les 3 blocs groupe (fenêtre période). */
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
      <main className={`groups-grid ${filtering ? 'is-filtering' : ''}`}>
        <WelcomeBanner
          kicker="Machines & consommation"
          title="Groupes électrogènes"
          subtitle="Heures, conso et écarts — affinez avec les filtres si besoin."
        />
        <form className="groups-filter-bar" onSubmit={(event) => event.preventDefault()}>
          <div className="filter-field">
            <label htmlFor="rapport_debut">Période — début</label>
            <select
              id="rapport_debut"
              value={rapportDebut}
              disabled={filtering}
              onChange={(event) => runFilters({ rapportDebut: event.target.value })}
            >
              {(groupsData.rapport_choices || []).map((choice) => (
                <option key={choice.id} value={String(choice.id)}>{choice.label}</option>
              ))}
            </select>
          </div>
          <div className="filter-field">
            <label htmlFor="rapport_fin">Période — fin</label>
            <select
              id="rapport_fin"
              value={rapportFin}
              disabled={filtering}
              onChange={(event) => runFilters({ rapportFin: event.target.value })}
            >
              {(groupsData.rapport_choices || []).map((choice) => (
                <option key={choice.id} value={String(choice.id)}>{choice.label}</option>
              ))}
            </select>
          </div>
          <div className="filter-field">
            <label htmlFor="site_id">Site</label>
            <select
              id="site_id"
              value={siteId}
              disabled={filtering}
              onChange={(event) => runFilters({ siteId: event.target.value })}
            >
              <option value="">Tous les sites</option>
              {(groupsData.sites || []).map((site) => (
                <option key={site.id} value={String(site.id)}>{site.nom_site}</option>
              ))}
            </select>
          </div>
          <div className="filter-field">
            <label htmlFor="view_mode">Affichage</label>
            <select
              id="view_mode"
              value={mode}
              disabled={filtering}
              onChange={(event) => {
                const next = event.target.value
                setMode(next)
                if (next === 'all') setSelectedGroupId('')
              }}
            >
              <option value="all">Vue d’ensemble</option>
              <option value="details">Détail</option>
            </select>
          </div>
        </form>

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
                    {(groupsData.group_blocks || []).map((g) => {
                      const siteName = g.site_nom || g.nom_site || g.site_name || (groupsData.sites || []).find((s) => String(s.id) === String(g.site_id))?.nom_site || ''
                      const hoursWindow = (g.hours_run || []).slice(startIndex, endIndex + 1)
                      const consWindow = (g.consumption || []).slice(startIndex, endIndex + 1)
                      const consumption = buildPeriodSeriesStats(consWindow)
                      const hours = buildPeriodSeriesStats(hoursWindow)
                      const autonomyEntity = buildGroupAutonomyEntity(g)
                      const severity = getAutonomySeverity(autonomyEntity)
                      const relatedAlerts = alertsByGroupId.get(String(g.id)) || []
                      const autonomyTitle = getAutonomyHint(autonomyEntity)
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
                              <button
                                type="button"
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
                              </button>
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
                    })}
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
                return (
                  <>
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
                  {relatedAlerts.length > 0 && (
                    <div className="group-related-alerts" role="region" aria-label="Alertes du groupe">
                      <strong>Alertes liées</strong>
                      <ul>
                        {relatedAlerts.map((alert) => (
                          <li key={alert.id}>
                            <button
                              type="button"
                              className="group-related-alert-link"
                              onClick={() => onNavigate?.({
                                view: 'alerts',
                                alertId: alert.id,
                                groupId: group.id,
                              })}
                            >
                              {alert.title}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  </>
                )
              })()}
              <div className="group-card-head">
                <span className="metric-label">Groupe</span>
                <h3>{group.label}</h3>
                { (group.site_nom || selectedSite?.nom_site) ? (
                  <p className="group-header-meta">{group.site_nom || selectedSite?.nom_site}</p>
                ) : null }

                {group.latest_main_volume != null && (
                  <p className="group-header-meta">Cuve principale : {group.latest_main_volume} litres</p>
                )}
                {group.latest_daily_volume != null && (
                  <p className="group-header-meta">Cuve journalière : {group.latest_daily_volume} litres</p>
                )}
              </div>

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
                        <p className="group-block-note">Sur les périodes de fonctionnement (&gt; 0 L/h)</p>
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

              <div className="group-curve-grid">
                <div className="chart-card">
                  <span className="curve-title">Courbe delta horaire</span>
                  <div className={`chart-box small-box${canScroll ? ' is-scrollable' : ''}`}><canvas id={`chart-group-${group.id}-hours`} /></div>
                </div>
                <div className="chart-card">
                  <span className="curve-title">Courbe consommation</span>
                  <div className={`chart-box small-box${canScroll ? ' is-scrollable' : ''}`}><canvas id={`chart-group-${group.id}-consumption`} /></div>
                </div>
                <div className="chart-card">
                  <span className="curve-title">Courbe consommation horaire</span>
                  <div className={`chart-box small-box${canScroll ? ' is-scrollable' : ''}`}><canvas id={`chart-group-${group.id}-hourly-consumption`} /></div>
                </div>
              </div>
            </article>
            )))
          }
        </section>
      </main>
      </PageEnter>
    </div>
  )
}

export default GroupsPage