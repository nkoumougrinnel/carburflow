import React, { useEffect, useMemo, useState } from 'react'
import { Building2, ChevronDown, Layers, Fuel } from 'lucide-react'
import Topbar from '@/components/Topbar.jsx'
import WelcomeBanner from '@/components/WelcomeBanner.jsx'
import PageEnter from '@/components/PageEnter.jsx'
import PageLoader from '@/components/PageLoader.jsx'
import { apiFetch } from '@/auth.js'
import { StatusBadge } from '@/components/ui/status-badge.jsx'
import { TankGauge } from '@/components/ui/tank-gauge.jsx'
import {
  SiteDetailBack,
  SiteDetailHeader,
  SiteDetailLayout,
  SiteMainTankBlock,
} from '@/components/site/SiteDetail.jsx'

function OperatorSitesPage({ onNavigate }) {
  const [sitesDashboard, setSitesDashboard] = useState(null)
  const [cuvesJournalieres, setCuvesJournalieres] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const querySiteId = useMemo(() => new URLSearchParams(window.location.search).get('siteId'), [])
  const [selectedSiteId, setSelectedSiteId] = useState(querySiteId || 'ALL')
  const [selectedLevelFilter, setSelectedLevelFilter] = useState('ALL')
  const [selectedAutonomyFilter, setSelectedAutonomyFilter] = useState('ALL')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [dashData, cjData] = await Promise.all([
          apiFetch('/api/dashboard/sites'),
          apiFetch('/api/cuves_journaliere').catch(() => []),
        ])
        const normalizedCj = Array.isArray(cjData)
          ? cjData
          : Array.isArray(cjData?.results)
            ? cjData.results
            : []

        if (!cancelled) {
          setSitesDashboard(dashData)
          setCuvesJournalieres(normalizedCj)
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Impossible de charger les sites.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const parsedSites = useMemo(() => {
    if (!sitesDashboard?.volumeSeries) return []

    return sitesDashboard.volumeSeries.map((series) => {
      const siteIdStr = String(series.id)
      const dataPoints = series.data || []
      const latestVolume = dataPoints.length > 0 ? (dataPoints[dataPoints.length - 1] ?? 0) : 0
      const capacity = series.capacity || 3000
      const cpId = series.cp_identifiant || `CP${String(series.id).padStart(3, '0')}`
      const percent = capacity > 0 ? (latestVolume / capacity) * 100 : 0

      const autonomyInfo = sitesDashboard.autonomyBySite?.[siteIdStr] || {}
      const groups = sitesDashboard.groupsBySite?.[siteIdStr] || []

      let statusKey = 'NORMAL'
      if (percent < 20) statusKey = 'CRITICAL'
      else if (percent < 40) statusKey = 'WARNING'
      else if (autonomyInfo.is_sans_fonctionnement) statusKey = 'OFF'
      else if (autonomyInfo.is_infinite_autonomy || autonomyInfo.is_infinite_consumption) statusKey = 'INDETERMINATE'

      const formattedAutonomy = autonomyInfo.formatted_autonomy || '—'
      const groupLabels = groups.map(g => g.label).join(', ') || '—'

      const siteCjs = cuvesJournalieres.filter(cj => String(cj.site_id) === siteIdStr || String(cj.cuve_principale) === siteIdStr)

      return {
        id: series.id,
        nom: series.nom_site || series.label || `Site ${series.id}`,
        cpIdentifiant: cpId,
        currentVolume: Math.round(latestVolume),
        capacity: Math.round(capacity),
        percent: Number(percent.toFixed(1)),
        statusKey,
        formattedAutonomy,
        autonomieHours: autonomyInfo.autonomie_hours,
        isInfiniteAutonomy: Boolean(autonomyInfo.is_infinite_autonomy),
        isSansFonctionnement: Boolean(autonomyInfo.is_sans_fonctionnement),
        groups,
        groupLabels,
        cuvesJournalieres: siteCjs,
      }
    }).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
  }, [sitesDashboard, cuvesJournalieres])

  const selectedSite = useMemo(() => {
    if (selectedSiteId === 'ALL') return null
    return parsedSites.find((s) => String(s.id) === String(selectedSiteId)) || null
  }, [parsedSites, selectedSiteId])

  const filteredSites = useMemo(() => {
    return parsedSites.filter((site) => {
      if (selectedSiteId !== 'ALL' && String(site.id) !== String(selectedSiteId)) return false

      if (selectedLevelFilter === 'CRITICAL' && site.statusKey !== 'CRITICAL') return false
      if (selectedLevelFilter === 'WARNING' && site.statusKey !== 'WARNING') return false
      if (selectedLevelFilter === 'NORMAL' && site.statusKey !== 'NORMAL') return false
      if (selectedLevelFilter === 'WATCH' && site.statusKey === 'NORMAL') return false

      if (selectedAutonomyFilter === 'LOW' && (site.autonomieHours == null || site.autonomieHours >= 72)) return false
      if (selectedAutonomyFilter === 'NORMAL' && (site.autonomieHours != null && site.autonomieHours < 72)) return false
      if (selectedAutonomyFilter === 'INDET' && !site.isInfiniteAutonomy) return false
      if (selectedAutonomyFilter === 'OFF' && !site.isSansFonctionnement) return false

      return true
    })
  }, [parsedSites, selectedSiteId, selectedLevelFilter, selectedAutonomyFilter])

  if (loading) {
    return (
      <div className="app-shell">
        <Topbar activeView="sites" onNavigate={onNavigate} />
        <PageLoader label="Chargement des sites et équipements..." />
      </div>
    )
  }

  /* ═══════════════════════════════════════════
     NIVEAU 2 — Vue détail Opérateur
     Socle commun + bande autonomie/consommation + cuves journalières.
     ═══════════════════════════════════════════ */
  if (selectedSite) {
    const groupsCount = selectedSite.groups.length
    const statusVariant =
      selectedSite.statusKey === 'CRITICAL' ? 'critical' :
      selectedSite.statusKey === 'WARNING' ? 'warning' : 'neutral'
    const statusLabel =
      selectedSite.statusKey === 'CRITICAL' ? 'Critique' :
      selectedSite.statusKey === 'WARNING' ? 'À surveiller' :
      selectedSite.statusKey === 'INDETERMINATE' ? 'Indéterminée' :
      selectedSite.statusKey === 'OFF' ? 'Sans fonctionnement' : 'Opérationnel'

    return (
      <div className="app-shell">
        <Topbar activeView="sites" onNavigate={onNavigate} />
        <PageEnter>
          <main className="user-home">
            <SiteDetailBack onBack={() => setSelectedSiteId('ALL')} />

            <SiteDetailLayout>
              {/* Socle commun : en-tête + cuve principale */}
              <article className="site-detail-card">
                <SiteDetailHeader
                  site={selectedSite}
                  kicker="Sites"
                  subtitle={`${selectedSite.cpIdentifiant} · ${groupsCount} groupe${groupsCount > 1 ? 's' : ''}`}
                  rightSlot={<StatusBadge variant={statusVariant} size="sm">{statusLabel}</StatusBadge>}
                />
                <SiteMainTankBlock site={selectedSite} />

                {/* Bande opérationnelle : autonomie + consommation */}
                <div className="site-main-metrics-grid" style={{ marginTop: '0.4rem' }}>
                  <article className="site-main-metric-card site-main-metric-card--emphasis">
                    <span className="site-main-metric-label">Autonomie estimée</span>
                    <strong className="site-main-metric-value">{selectedSite.formattedAutonomy}</strong>
                  </article>
                  <article className="site-main-metric-card">
                    <span className="site-main-metric-label">Conso. moyenne / h</span>
                    <strong className="site-main-metric-value">—</strong>
                  </article>
                </div>
              </article>

              {/* Bloc Opérateur — cuves journalières */}
              <section className="site-detail-section" aria-label="Cuves journalières">
                <div className="site-detail-section-head">
                  <div>
                    <span className="metric-label">Stockage journalier</span>
                    <h3>Cuves journalières</h3>
                  </div>
                  <span className="site-detail-section-count">
                    {selectedSite.cuvesJournalieres.length} cuve{selectedSite.cuvesJournalieres.length > 1 ? 's' : ''}
                  </span>
                </div>

                {selectedSite.cuvesJournalieres.length === 0 ? (
                  <div className="site-attached-groups-empty">
                    <Layers size={20} className="text-muted" />
                    <div>Aucune cuve journalière configurée pour ce site.</div>
                  </div>
                ) : (
                  <div className="cj-cards-grid">
                    {selectedSite.cuvesJournalieres.map((cj) => {
                      const cap = cj.capacite || 1000
                      const cjPct = selectedSite.percent
                      const cjVol = Math.round((cjPct / 100) * cap)
                      const groupLabel = cj.groupe_electrogene_identifiant || cj.groupe_electrogene || selectedSite.groupLabels || '—'

                      const isCritical = cjPct < 20
                      const isWarning = !isCritical && cjPct < 40
                      const cjBadgeVariant = isCritical ? 'critical' : isWarning ? 'warning' : 'success'
                      const cjBadgeLabel = isCritical ? 'Critique' : isWarning ? 'Surveillance' : 'Active'

                      return (
                        <article key={cj.id} className="cj-card">
                          <TankGauge
                            variant="vertical"
                            size="md"
                            percent={cjPct}
                            currentVolume={cjVol}
                            capacity={cap}
                          />
                          <div className="site-main-metrics-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                            <div className="site-main-metric-card">
                              <span className="site-main-metric-label">Niveau</span>
                              <strong className="site-main-metric-value">{cjVol.toLocaleString('fr-FR')} / {cap.toLocaleString('fr-FR')} L</strong>
                            </div>
                            <div className="site-main-metric-card">
                              <span className="site-main-metric-label">Remplissage</span>
                              <strong className="site-main-metric-value">{Math.round(cjPct)} %</strong>
                            </div>
                            <div className="site-main-metric-card" style={{ gridColumn: '1 / -1' }}>
                              <span className="site-main-metric-label">Groupe alimenté</span>
                              <strong className="site-main-metric-value" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Fuel size={14} />
                                {groupLabel}
                              </strong>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span className="metric-label">{cj.identifiant || `CJ${cj.id}`}</span>
                            <StatusBadge variant={cjBadgeVariant} size="sm">{cjBadgeLabel}</StatusBadge>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}
              </section>
            </SiteDetailLayout>
          </main>
        </PageEnter>
      </div>
    )
  }

  /* ═══════════════════════════════════════════
     VUE LISTE — Mes sites Opérateur
     ═══════════════════════════════════════════ */
  return (
    <div className="app-shell">
      <Topbar activeView="sites" onNavigate={onNavigate} />
      <PageEnter>
        <main className="user-home">

          <WelcomeBanner
            kicker="ESPACE OPÉRATEUR"
            title="Sites & Équipements"
            subtitle="Consultez l'état actuel de vos sites, cuves et groupes."
          />

          {error && (
            <div className="reports-error-panel" role="alert">
              <div className="reports-error-panel-head">
                <strong>Erreur</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          <div className="op-filters-bar">
            <div className="op-filter-field">
              <label htmlFor="op-sites-select">Site</label>
              <div className="op-select-wrap">
                <select
                  id="op-sites-select"
                  value={selectedSiteId}
                  onChange={(e) => setSelectedSiteId(e.target.value)}
                >
                  <option value="ALL">Tous les sites ({parsedSites.length})</option>
                  {parsedSites.map((s) => (
                    <option key={s.id} value={s.id}>{s.nom}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="op-select-icon" />
              </div>
            </div>

            <div className="op-filter-field">
              <label htmlFor="op-level-select">Niveau</label>
              <div className="op-select-wrap">
                <select
                  id="op-level-select"
                  value={selectedLevelFilter}
                  onChange={(e) => setSelectedLevelFilter(e.target.value)}
                >
                  <option value="ALL">Tous les niveaux</option>
                  <option value="WATCH">À surveiller (Critique & Attention)</option>
                  <option value="CRITICAL">Critique (&lt; 20%)</option>
                  <option value="WARNING">À surveiller (20-40%)</option>
                  <option value="NORMAL">Normal (≥ 40%)</option>
                </select>
                <ChevronDown size={16} className="op-select-icon" />
              </div>
            </div>

            <div className="op-filter-field">
              <label htmlFor="op-autonomy-select">Autonomie</label>
              <div className="op-select-wrap">
                <select
                  id="op-autonomy-select"
                  value={selectedAutonomyFilter}
                  onChange={(e) => setSelectedAutonomyFilter(e.target.value)}
                >
                  <option value="ALL">Toutes les autonomies</option>
                  <option value="LOW">Faible (&lt; 3 jours)</option>
                  <option value="NORMAL">Normale (≥ 3 jours)</option>
                  <option value="INDET">Indéterminée</option>
                  <option value="OFF">Sans fonctionnement</option>
                </select>
                <ChevronDown size={16} className="op-select-icon" />
              </div>
            </div>
          </div>

          <section className="op-section-panel">
            <div className="op-section-header">
              <div>
                <span className="op-section-kicker">Mes sites</span>
                <h2>Sites sous votre charge</h2>
                <p>Aperçu opérationnel des sites, niveaux et autonomies.</p>
              </div>
            </div>

            <div className="dashboard-table-scroll">
              <table className="op-table">
                <thead>
                  <tr>
                    <th className="col-flex" style={{ textAlign: 'left' }}>Site</th>
                    <th className="col-flex" style={{ textAlign: 'left' }}>Niveau</th>
                    <th className="col-alerts" style={{ textAlign: 'left' }}>Autonomie</th>
                    <th className="col-flex" style={{ textAlign: 'left' }}>Groupe(s)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSites.map((site) => (
                    <tr
                      key={site.id}
                      className="dashboard-row-link"
                      onClick={() => setSelectedSiteId(String(site.id))}
                      tabIndex={0}
                      role="link"
                      aria-label={`Ouvrir le site ${site.nom}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedSiteId(String(site.id))
                        }
                      }}
                    >
                      <td className="col-flex" style={{ textAlign: 'left' }}>
                        <div className="op-table-site-name">
                          <Building2 size={16} className="op-table-site-icon" />
                          <div>
                            <strong>{site.nom}</strong>
                            <div className="op-cp-tag">{site.cpIdentifiant}</div>
                          </div>
                        </div>
                      </td>

                      <td className="col-flex" style={{ textAlign: 'left' }}>
                        <TankGauge
                          variant="horizontal"
                          percent={site.percent}
                          currentVolume={site.currentVolume}
                          capacity={site.capacity}
                          showLabels
                        />
                      </td>

                      <td className="col-alerts" style={{ textAlign: 'left' }}>
                        <strong className="text-primary">{site.formattedAutonomy}</strong>
                      </td>

                      <td className="col-flex" style={{ textAlign: 'left' }}>
                        <span className="op-cp-tag">{site.groupLabels}</span>
                      </td>
                    </tr>
                  ))}

                  {filteredSites.length === 0 && (
                    <tr>
                      <td colSpan="4" className="empty-state-cell">
                        Aucun site ne correspond aux critères sélectionnés.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

        </main>
      </PageEnter>
    </div>
  )
}

export default OperatorSitesPage