import React, { useEffect, useMemo, useState } from 'react'
import { PlusCircle, Building2, ChevronRight, Upload, Layers } from 'lucide-react'
import Topbar from '@/components/Topbar.jsx'
import WelcomeBanner from '@/components/WelcomeBanner.jsx'
import PageEnter from '@/components/PageEnter.jsx'
import PageLoader from '@/components/PageLoader.jsx'
import { apiFetch, listMesRapports } from '@/auth.js'
import { formatDate } from '@/components/reports/ReportsUi.jsx'
import { useAuth } from '@/context/AuthContext.jsx'
import { getDisplayFirstName } from '@/utils/userDisplay.js'
import { StatusBadge } from '@/components/ui/status-badge.jsx'
import { TankGauge } from '@/components/ui/tank-gauge.jsx'

function OperatorHomePage({ onNavigate }) {
  const { user } = useAuth()
  const [sitesDashboard, setSitesDashboard] = useState(null)
  const [rapports, setRapports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const firstName = getDisplayFirstName(user) || 'Agent'

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [dashData, repData] = await Promise.all([
          apiFetch('/api/dashboard/sites').catch(() => null),
          listMesRapports().catch(() => []),
        ])
        if (!cancelled) {
          setSitesDashboard(dashData)
          setRapports(Array.isArray(repData) ? repData : [])
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Impossible de charger l’espace opérateur.')
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
      const mainGroup = groups[0]?.label || '—'

      return {
        id: series.id,
        nom: series.nom_site || series.label || `Site ${series.id}`,
        cpIdentifiant: cpId,
        currentVolume: Math.round(latestVolume),
        capacity: Math.round(capacity),
        percent: Number(percent.toFixed(1)),
        statusKey,
        formattedAutonomy,
        mainGroup,
      }
    }).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
  }, [sitesDashboard])

  // Limite à 5 ou 6 sites max pour la Home Opérateur
  const homeSites = useMemo(() => parsedSites.slice(0, 6), [parsedSites])

  const lastRapport = rapports[0] || null
  const recentRapports = useMemo(() => rapports.slice(0, 6), [rapports])

  if (loading) {
    return (
      <div className="app-shell app-shell--operator">
        <Topbar activeView="operator" onNavigate={onNavigate} />
        <PageLoader label="Chargement du poste de pilotage opérateur…" />
      </div>
    )
  }

  return (
    <div className="app-shell app-shell--operator">
      <Topbar activeView="operator" onNavigate={onNavigate} />
      <PageEnter>
        <main className="user-home">

          {/* HERO — même bannière partagée (WelcomeBanner) que les autres pages */}
          <WelcomeBanner
            kicker="POSTE DE PILOTAGE"
            title={`Bonjour ${firstName} !`}
            subtitle="Suivez l’état de vos sites et transmettez vos relevés."
            actions={
              <button
                type="button"
                className="op-hero-cta-btn op-hero-cta-btn--on-banner"
                onClick={() => onNavigate('reports')}
              >
                <PlusCircle size={18} />
                <span>Envoyer un relevé</span>
              </button>
            }
          />

          {error && (
            <div className="reports-error-panel" role="alert">
              <div className="reports-error-panel-head">
                <strong>Problème</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* RÉSUMÉ : 3 KPI Opérationnels (repères du quotidien) */}
          <section className="op-indicators-grid" aria-label="Repères opérationnels">
            <article className="op-indicator-card">
              <span className="op-indicator-value">{parsedSites.length}</span>
              <span className="op-indicator-label">Sites suivis</span>
              <span className="op-indicator-sub">Sites sous votre charge</span>
            </article>

            <article className="op-indicator-card op-indicator-card--normal">
              <span className="op-indicator-value">{rapports.length}</span>
              <span className="op-indicator-label">Relevés transmis</span>
              <span className="op-indicator-sub">Rapports envoyés</span>
            </article>

            <article className="op-indicator-card">
              <span className="op-indicator-value" style={{ fontSize: '1.4rem', marginTop: '0.4rem' }}>
                {lastRapport
                  ? `${formatDate(lastRapport.date_debut)} → ${formatDate(lastRapport.date_fin)}`
                  : 'Aucun'}
              </span>
              <span className="op-indicator-label">Dernier relevé</span>
              <span className="op-indicator-sub">
                {lastRapport ? `${lastRapport.lignes_count ?? 0} ligne(s)` : 'Période récente'}
              </span>
            </article>
          </section>

          {/* LAYOUT 2 COLONNES DESKTOP (65% / 35%) */}
          <div className="op-home-grid-layout">
            
            {/* Colonne Gauche (~65%) : MES SITES */}
            <section className="op-section-panel op-home-left-col">
              <div className="op-section-header">
                <div>
                  <span className="op-section-kicker">Vos équipements</span>
                  <h2>Mes sites</h2>
                  <p>État actuel des sites dont vous avez la charge.</p>
                </div>
                <button
                  type="button"
                  className="op-btn-secondary"
                  onClick={() => onNavigate('sites')}
                >
                  <span>Voir tous les sites</span>
                  <ChevronRight size={16} />
                </button>
              </div>

              {homeSites.length === 0 ? (
                <div className="op-empty-card">
                  <Building2 size={24} className="text-muted" />
                  <div>
                    <strong>Aucun site sous votre charge pour le moment.</strong>
                  </div>
                </div>
              ) : (
                <div className="op-sites-cards-list">
                  {homeSites.map((site) => (
                    <article
                      key={site.id}
                      className="op-site-card-row"
                      onClick={() => onNavigate({
                        view: 'sites',
                        siteId: site.id,
                        siteName: site.nom,
                        mode: 'details',
                      })}
                      tabIndex={0}
                      role="button"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onNavigate({
                            view: 'sites',
                            siteId: site.id,
                            siteName: site.nom,
                            mode: 'details',
                          })
                        }
                      }}
                    >
                      <div className="op-site-card-head">
                        <div className="op-site-card-title-group">
                          <Building2 size={18} className="text-primary" />
                          <div>
                            <h3>{site.nom}</h3>
                            <span className="op-cp-tag">{site.cpIdentifiant}</span>
                          </div>
                        </div>
                        <StatusBadge
                          variant={
                            site.statusKey === 'CRITICAL' ? 'critical' :
                            site.statusKey === 'WARNING' ? 'warning' : 'neutral'
                          }
                          size="sm"
                        >
                          {site.statusKey === 'CRITICAL' ? 'Critique' :
                           site.statusKey === 'WARNING' ? 'À surveiller' :
                           site.statusKey === 'INDETERMINATE' ? 'Indéterminée' :
                           site.statusKey === 'OFF' ? 'Sans fonctionnement' : 'Normal'}
                        </StatusBadge>
                      </div>

                      <div className="op-site-card-metrics">
                        <div className="op-site-metric-col">
                          <div className="op-site-metric-val">{Math.round(site.percent)} %</div>
                          <span className="op-site-metric-sub">{site.currentVolume.toLocaleString('fr-FR')} / {site.capacity.toLocaleString('fr-FR')} L</span>
                          <TankGauge
                            variant="horizontal"
                            percent={site.percent}
                            currentVolume={site.currentVolume}
                            capacity={site.capacity}
                          />
                        </div>

                        <div className="op-site-metric-col">
                          <span className="op-site-metric-lbl">Autonomie</span>
                          <strong className="op-site-metric-highlight">{site.formattedAutonomy}</strong>
                        </div>

                        <div className="op-site-metric-col">
                          <span className="op-site-metric-lbl">Groupe principal</span>
                          <span className="op-cp-tag">{site.mainGroup}</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              <div className="op-home-panel-footer">
                <button
                  type="button"
                  className="op-btn-secondary"
                  onClick={() => onNavigate('sites')}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <span>Voir tous les sites ({parsedSites.length})</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </section>

            {/* Colonne Droite (~35%) : DERNIERS RELEVÉS */}
            <section className="op-section-panel op-home-right-col">
              <div className="op-section-header">
                <div>
                  <span className="op-section-kicker">Envois</span>
                  <h2>Derniers relevés</h2>
                  <p>Mes derniers relevés transmis.</p>
                </div>
              </div>

              {recentRapports.length === 0 ? (
                <div className="op-empty-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.8rem' }}>
                  <p className="text-muted" style={{ margin: 0 }}>Aucun relevé envoyé pour le moment.</p>
                  <button
                    type="button"
                    className="op-hero-cta-btn"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                    onClick={() => onNavigate('reports')}
                  >
                    <PlusCircle size={15} />
                    <span>Envoyer mon premier relevé</span>
                  </button>
                </div>
              ) : (
                <ul className="op-reports-simple-list">
                  {recentRapports.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        className="op-report-item-btn"
                        onClick={() => onNavigate({ view: 'reports', pane: 'download' })}
                      >
                        <div className="op-report-item-id">
                          <Upload size={14} className="text-primary" />
                          <strong>#{r.id}</strong>
                        </div>
                        <div className="op-report-item-details">
                          <span className="op-report-item-dates">
                            {formatDate(r.date_debut)} → {formatDate(r.date_fin)}
                          </span>
                          <span className="op-report-item-lines">
                            {r.lignes_count ?? 0} ligne{(r.lignes_count ?? 0) > 1 ? 's' : ''}
                          </span>
                        </div>
                        <ChevronRight size={14} className="text-muted" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="op-home-panel-footer">
                <button
                  type="button"
                  className="op-btn-secondary"
                  onClick={() => onNavigate({ view: 'reports', pane: 'download' })}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <span>Voir tous les relevés</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </section>

          </div>

        </main>
      </PageEnter>
    </div>
  )
}

export default OperatorHomePage
