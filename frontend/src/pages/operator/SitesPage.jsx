import React, { useEffect, useMemo, useState } from 'react'
import { Building2, ChevronDown, ArrowLeft, Zap, Fuel, Layers } from 'lucide-react'
import Topbar from '@/components/Topbar.jsx'
import WelcomeBanner from '@/components/WelcomeBanner.jsx'
import PageEnter from '@/components/PageEnter.jsx'
import PageLoader from '@/components/PageLoader.jsx'
import { apiFetch } from '@/auth.js'
import { StatusBadge } from '@/components/ui/status-badge.jsx'
import { TankGauge } from '@/components/ui/tank-gauge.jsx'

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

      // Cuves journalières rattachées au site
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
     VUE DÉTAIL — quand un site est sélectionné
     ═══════════════════════════════════════════ */
  if (selectedSite) {
    const volumeDisponible = Math.max(0, selectedSite.capacity - selectedSite.currentVolume)
    const groupsCount = selectedSite.groups.length

    return (
      <div className="app-shell">
        <Topbar activeView="sites" onNavigate={onNavigate} />
        <PageEnter>
          <main className="user-home">

            <button
                type="button"
                className="op-btn-back"
                onClick={() => setSelectedSiteId('ALL')}
                style={{ marginTop: '0.8rem' }}
              >
                <ArrowLeft size={15} />
                <span>Retour aux sites</span>
              </button>

            {/* En-tête du site */}
            <article className="group-card" style={{ position: 'relative', borderLeft: '4px solid #0b3d7a', padding: '1.5rem' }}>
              <div style={{ position: 'absolute', top: '1.2rem', right: '1.2rem' }}>
                <StatusBadge
                  variant={
                    selectedSite.statusKey === 'CRITICAL' ? 'critical' :
                    selectedSite.statusKey === 'WARNING' ? 'warning' : 'neutral'
                  }
                  size="sm"
                >
                  {selectedSite.statusKey === 'CRITICAL' ? 'Critique' :
                   selectedSite.statusKey === 'WARNING' ? 'À surveiller' :
                   selectedSite.statusKey === 'INDETERMINATE' ? 'Indéterminée' :
                   selectedSite.statusKey === 'OFF' ? 'Sans fonctionnement' : 'Normal'}
                </StatusBadge>
              </div>

              <div className="section-title-wrap">
                <span className="metric-label">Sites</span>
                <h2>{selectedSite.nom}</h2>
              </div>
              <p style={{ margin: '0.3rem 0 0', color: 'var(--muted)', fontSize: '0.92rem' }}>
                Site · {selectedSite.cpIdentifiant} · {groupsCount} groupe{groupsCount > 1 ? 's' : ''}
              </p>

              <div className="op-tank-main-layout">
                {/* À gauche : grande cuve */}
                <TankGauge
                  variant="vertical"
                  size="lg"
                  percent={selectedSite.percent}
                  currentVolume={selectedSite.currentVolume}
                  capacity={selectedSite.capacity}
                />

                {/* À droite : métriques essentielles + Autonomie */}
                <div className="op-tank-main-metrics">
                  <div className="op-tank-metric">
                    <strong className="op-tank-metric-value">
                      {selectedSite.currentVolume.toLocaleString('fr-FR')} L
                    </strong>
                    <span className="op-tank-metric-label">Niveau actuel</span>
                  </div>

                  <div className="op-tank-metric">
                    <strong className="op-tank-metric-value">
                      {Math.round(selectedSite.percent)} %
                    </strong>
                    <span className="op-tank-metric-label">Niveau de remplissage</span>
                  </div>

                  <div className="op-tank-metric">
                    <strong className="op-tank-metric-value">
                      {selectedSite.capacity.toLocaleString('fr-FR')} L
                    </strong>
                    <span className="op-tank-metric-label">Capacité totale</span>
                  </div>

                  <div className="op-tank-metric">
                    <strong className="op-tank-metric-value">
                      {volumeDisponible.toLocaleString('fr-FR')} L
                    </strong>
                    <span className="op-tank-metric-label">Volume disponible</span>
                  </div>

                  <div className="op-tank-metric">
                    <strong className="op-tank-metric-value" style={{ color: 'var(--primary)' }}>
                      {selectedSite.formattedAutonomy}
                    </strong>
                    <span className="op-tank-metric-label">Autonomie estimée</span>
                  </div>
                </div>
              </div>

            </article>

            

            {/* Section CUVES JOURNALIÈRES */}
            <section className="op-section-panel">
              <div className="op-section-header">
                <div>
                  <span className="op-section-kicker">Stockage journalier</span>
                  <h2>Cuves journalières</h2>
                  <p>Cuves secondaires rattachées aux groupes électrogènes du site.</p>
                </div>
              </div>

              {selectedSite.cuvesJournalieres.length === 0 ? (
                <div className="op-empty-card">
                  <Layers size={24} className="text-muted" />
                  <div>
                    <strong>Aucune cuve journalière configurée</strong>
                    <p>Ce site utilise directement la cuve principale.</p>
                  </div>
                </div>
              ) : (
                <div className="cj-cards-grid">
                  {selectedSite.cuvesJournalieres.map((cj) => {
                    const cap = cj.capacite || 1000
                    // Estimation niveau CJ basée sur le ratio du site si non spécifié
                    const cjPct = selectedSite.percent
                    const cjVol = Math.round((cjPct / 100) * cap)

                    return (
                      <article key={cj.id} className="cj-card">
                        <div className="cj-card-left">
                          <TankGauge
                            variant="vertical"
                            size="sm"
                            percent={cjPct}
                          />
                        </div>

                        <div className="cj-card-center">
                          <h3 className="cj-code">{cj.identifiant || `CJ${cj.id}`}</h3>
                          <span className="cj-status">Fonctionnelle</span>

                          <div className="cj-info-row">
                            <span className="cj-info-label">Capacité</span>
                            <strong>{cap.toLocaleString('fr-FR')} L</strong>
                          </div>

                          <div className="cj-info-row">
                            <span className="cj-info-label">Niveau actuel</span>
                            <strong>{Math.round(cjPct)} % ({cjVol} / {cap} L)</strong>
                          </div>

                          <TankGauge
                            variant="horizontal"
                            percent={cjPct}
                            currentVolume={cjVol}
                            capacity={cap}
                          />
                        </div>

                        <div className="cj-card-right">
                          <span className="cj-group-tag">Groupe alimenté</span>
                          <div className="cj-group-badge">
                            <Zap size={14} className="text-primary" />
                            <span>{cj.groupe_electrogene_identifiant || cj.groupe_electrogene || selectedSite.groupLabels || 'Groupe G1'}</span>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>

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

          {/* 3 Filtres Opérateur : Site, Niveau, Autonomie */}
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

          {/* Liste "Mes sites" */}
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
                    <th style={{ textAlign: 'left' }}>Site</th>
                    <th style={{ textAlign: 'left' }}>Niveau</th>
                    <th style={{ textAlign: 'left' }}>Autonomie</th>
                    <th style={{ textAlign: 'left' }}>Groupe(s)</th>
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
                      <td style={{ textAlign: 'left' }}>
                        <div className="op-table-site-name">
                          <Building2 size={16} className="op-table-site-icon" />
                          <div>
                            <strong>{site.nom}</strong>
                            <div className="op-cp-tag">{site.cpIdentifiant}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ textAlign: 'left' }}>
                        <TankGauge
                          variant="horizontal"
                          percent={site.percent}
                          currentVolume={site.currentVolume}
                          capacity={site.capacity}
                          showLabels
                        />
                      </td>

                      <td style={{ textAlign: 'left' }}>
                        <strong className="text-primary">{site.formattedAutonomy}</strong>
                      </td>

                      <td style={{ textAlign: 'left' }}>
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
