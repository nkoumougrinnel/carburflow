import React, { useEffect, useMemo, useState } from 'react'
import { Building2, ChevronDown, ArrowLeft } from 'lucide-react'
import Topbar from '@/components/Topbar.jsx'
import WelcomeBanner from '@/components/WelcomeBanner.jsx'
import PageEnter from '@/components/PageEnter.jsx'
import PageLoader from '@/components/PageLoader.jsx'
import { apiFetch } from '@/auth.js'
import { ViewerStatusBadge } from './HomePage.jsx'

/**
 * Grande cuve verticale — élément visuel dominant de la page détail.
 */
function LargeTankGauge({ percent }) {
  const safePercent = Math.min(100, Math.max(0, percent || 0))
  let fillGradient = 'linear-gradient(180deg, #10b981 0%, #059669 100%)'
  let glowColor = 'rgba(16, 185, 129, 0.25)'

  if (safePercent < 20) {
    fillGradient = 'linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)'
    glowColor = 'rgba(239, 68, 68, 0.35)'
  } else if (safePercent < 40) {
    fillGradient = 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)'
    glowColor = 'rgba(245, 158, 11, 0.3)'
  }

  return (
    <div className="viewer-tank-large-wrap">
      <div className="viewer-tank-large">
        <div className="viewer-tank-large-cap" />
        <div className="viewer-tank-large-body">
          <div className="viewer-tank-large-ticks">
            <span className="viewer-tank-large-tick" style={{ bottom: '75%' }}>75%</span>
            <span className="viewer-tank-large-tick" style={{ bottom: '50%' }}>50%</span>
            <span className="viewer-tank-large-tick" style={{ bottom: '25%' }}>25%</span>
          </div>
          <div
            className="viewer-tank-large-liquid"
            style={{
              height: `${safePercent}%`,
              background: fillGradient,
              boxShadow: `0 0 18px ${glowColor}`,
            }}
          >
            <div className="viewer-tank-large-surface" />
          </div>
          <div className="viewer-tank-large-shine" />
        </div>
        <div className="viewer-tank-large-base" />
      </div>
    </div>
  )
}

function HorizontalTankGauge({ percent, currentVolume, capacity }) {
  const safePercent = Math.min(100, Math.max(0, percent || 0))
  let barColor = '#10b981'
  if (safePercent < 20) barColor = '#ef4444'
  else if (safePercent < 40) barColor = '#f59e0b'

  return (
    <div className="viewer-table-gauge-wrap">
      <div className="viewer-table-gauge-text">
        <strong>{Math.round(safePercent)} %</strong>
        <span className="viewer-table-gauge-volumes">· {Math.round(currentVolume).toLocaleString('fr-FR')} / {Math.round(capacity).toLocaleString('fr-FR')} L</span>
      </div>
      <div className="viewer-table-gauge-track">
        <div
          className="viewer-table-gauge-fill"
          style={{ width: `${safePercent}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  )
}

function UserSitesPage({ onNavigate }) {
  const [sitesDashboard, setSitesDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const querySiteId = useMemo(() => new URLSearchParams(window.location.search).get('siteId'), [])
  const [selectedSiteId, setSelectedSiteId] = useState(querySiteId || 'ALL')
  const [selectedLevelFilter, setSelectedLevelFilter] = useState('ALL')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const data = await apiFetch('/api/dashboard/sites')
        if (!cancelled) setSitesDashboard(data)
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
      const dataPoints = series.data || []
      const latestVolume = dataPoints.length > 0 ? (dataPoints[dataPoints.length - 1] ?? 0) : 0
      const capacity = series.capacity || 3000
      const cpId = series.cp_identifiant || `CP${String(series.id).padStart(3, '0')}`
      const percent = capacity > 0 ? (latestVolume / capacity) * 100 : 0

      let statusKey = 'NORMAL'
      if (percent < 20) statusKey = 'CRITICAL'
      else if (percent < 40) statusKey = 'WARNING'

      return {
        id: series.id,
        nom: series.nom_site || series.label || `Site ${series.id}`,
        cpIdentifiant: cpId,
        currentVolume: Math.round(latestVolume),
        capacity: Math.round(capacity),
        percent: Number(percent.toFixed(1)),
        statusKey,
      }
    }).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
  }, [sitesDashboard])

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
      return true
    })
  }, [parsedSites, selectedSiteId, selectedLevelFilter])

  if (loading) {
    return (
      <div className="app-shell">
        <Topbar activeView="sites" onNavigate={onNavigate} />
        <PageLoader label="Chargement des sites..." />
      </div>
    )
  }

  /* ═══════════════════════════════════════════
     VUE DÉTAIL — quand un site est sélectionné
     ═══════════════════════════════════════════ */
  if (selectedSite) {
    const volumeDisponible = Math.max(0, selectedSite.capacity - selectedSite.currentVolume)

    return (
      <div className="app-shell">
        <Topbar activeView="sites" onNavigate={onNavigate} />
        <PageEnter>
          <main className="user-home">

            {/* Bouton retour discret */}
              <button
                type="button"
                className="viewer-btn-back"
                onClick={() => setSelectedSiteId('ALL')}
                style={{ marginTop: '0.8rem' }}
              >
                <ArrowLeft size={15} />
                <span>Retour aux sites</span>
              </button>

            {/* En-tête du site — même structure que SitesPage admin */}
            <article className="group-card" style={{ position: 'relative', borderLeft: '4px solid #0b3d7a', padding: '1.5rem' }}>

              {/* Badge unique en haut à droite */}
              <div style={{ position: 'absolute', top: '1.2rem', right: '1.2rem' }}>
                <ViewerStatusBadge statusKey={selectedSite.statusKey} />
              </div>

              <div className="section-title-wrap">
                <span className="metric-label">Site</span>
                <h2>{selectedSite.nom}</h2>
              </div>
              <p style={{ margin: '0.3rem 0 0', color: 'var(--muted)', fontSize: '0.92rem' }}>
                État de la cuve principale
              </p>

              <div className="viewer-tank-main-layout">
                {/* À gauche : grande cuve */}
                <LargeTankGauge percent={selectedSite.percent} />

                {/* À droite : les 4 métriques essentielles */}
                <div className="viewer-tank-main-metrics">
                  <div className="viewer-tank-metric">
                    <strong className="viewer-tank-metric-value">
                      {selectedSite.currentVolume.toLocaleString('fr-FR')} L
                    </strong>
                    <span className="viewer-tank-metric-label">Niveau actuel</span>
                  </div>

                  <div className="viewer-tank-metric">
                    <strong className="viewer-tank-metric-value">
                      {Math.round(selectedSite.percent)} %
                    </strong>
                    <span className="viewer-tank-metric-label">Niveau de remplissage</span>
                  </div>

                  <div className="viewer-tank-metric">
                    <strong className="viewer-tank-metric-value">
                      {selectedSite.capacity.toLocaleString('fr-FR')} L
                    </strong>
                    <span className="viewer-tank-metric-label">Capacité totale</span>
                  </div>

                  <div className="viewer-tank-metric">
                    <strong className="viewer-tank-metric-value">
                      {volumeDisponible.toLocaleString('fr-FR')} L
                    </strong>
                    <span className="viewer-tank-metric-label">Volume disponible</span>
                  </div>
                </div>
              </div>
            </article>
          </main>
        </PageEnter>
      </div>
    )
  }

  /* ═══════════════════════════════════════════
     VUE LISTE — tous les sites
     ═══════════════════════════════════════════ */
  return (
    <div className="app-shell">
      <Topbar activeView="sites" onNavigate={onNavigate} />
      <PageEnter>
        <main className="user-home">

          <WelcomeBanner
            kicker="Espace consultation"
            title="Sites & Cuves Principales"
            subtitle="Consultez l'ensemble des cuves principales et l'état détaillé de vos sites."
          />

          {error && (
            <div className="reports-error-panel" role="alert">
              <div className="reports-error-panel-head">
                <strong>Erreur</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* 2 filtres uniquement (Site & Niveau) */}
          <div className="viewer-filters-bar">
            <div className="viewer-filter-field">
              <label htmlFor="viewer-sites-select">Site</label>
              <div className="viewer-select-wrap">
                <select
                  id="viewer-sites-select"
                  value={selectedSiteId}
                  onChange={(e) => setSelectedSiteId(e.target.value)}
                >
                  <option value="ALL">Tous les sites ({parsedSites.length})</option>
                  {parsedSites.map((s) => (
                    <option key={s.id} value={s.id}>{s.nom}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="viewer-select-icon" />
              </div>
            </div>

            <div className="viewer-filter-field">
              <label htmlFor="viewer-level-select">Niveau</label>
              <div className="viewer-select-wrap">
                <select
                  id="viewer-level-select"
                  value={selectedLevelFilter}
                  onChange={(e) => setSelectedLevelFilter(e.target.value)}
                >
                  <option value="ALL">Tous les niveaux</option>
                  <option value="WATCH">À surveiller (Critique & Attention)</option>
                  <option value="CRITICAL">Critique (&lt; 20%)</option>
                  <option value="WARNING">À surveiller (20-40%)</option>
                  <option value="NORMAL">Normal (≥ 40%)</option>
                </select>
                <ChevronDown size={16} className="viewer-select-icon" />
              </div>
            </div>
          </div>

          <section className="viewer-section-panel">
            <div className="viewer-section-header">
              <div>
                <span className="viewer-section-kicker">Parc complet</span>
                <h2>Tous les sites</h2>
                <p>Aperçu général du niveau de vos cuves principales.</p>
              </div>
            </div>

            <div className="dashboard-table-scroll">
              <table className="viewer-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Site</th>
                    <th style={{ textAlign: 'left' }}>Niveau</th>
                    <th style={{ textAlign: 'center' }}>État</th>
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
                        <div className="viewer-table-site-name">
                          <Building2 size={16} className="viewer-table-site-icon" />
                          <div>
                            <strong>{site.nom}</strong>
                            <div className="viewer-cp-tag">{site.cpIdentifiant}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ textAlign: 'left' }}>
                        <HorizontalTankGauge
                          percent={site.percent}
                          currentVolume={site.currentVolume}
                          capacity={site.capacity}
                        />
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <ViewerStatusBadge statusKey={site.statusKey} />
                      </td>
                    </tr>
                  ))}

                  {filteredSites.length === 0 && (
                    <tr>
                      <td colSpan="3" className="empty-state-cell">
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

export default UserSitesPage
