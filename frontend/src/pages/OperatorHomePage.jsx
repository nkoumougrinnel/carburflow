import React from 'react'
import { Fuel } from 'lucide-react'
import Topbar from '../components/Topbar.jsx'
import WelcomeBanner from '../components/WelcomeBanner.jsx'
import PageEnter from '../components/PageEnter.jsx'
import PageLoader from '../components/PageLoader.jsx'
import AutonomyBadge from '../components/AutonomyBadge.jsx'
import { apiFetch, listMesRapports } from '../auth.js'
import { formatDate } from '../components/reports/ReportsUi.jsx'

function OperatorHomePage({ onNavigate }) {
  const [sitesDashboard, setSitesDashboard] = React.useState(null)
  const [rapports, setRapports] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [sites, reports] = await Promise.all([
          apiFetch('/api/v1/dashboard/sites').catch(() => null),
          listMesRapports().catch(() => []),
        ])
        if (cancelled) return
        setSitesDashboard(sites)
        setRapports(Array.isArray(reports) ? reports : [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Impossible de charger votre espace.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const sites = React.useMemo(() => {
    if (!sitesDashboard) return []
    const byId = new Map()
    ;[
      ...(sitesDashboard.volumeSeries || []),
      ...(sitesDashboard.consumptionSeries || []),
      ...(sitesDashboard.hoursSeries || []),
    ].forEach((site) => {
      byId.set(String(site.id), {
        id: site.id,
        nom: site.nom_site || site.label || `Site ${site.id}`,
      })
    })
    return [...byId.values()].sort((a, b) => String(a.nom).localeCompare(String(b.nom), 'fr'))
  }, [sitesDashboard])

  const autonomyBySite = sitesDashboard?.autonomyBySite || {}
  const lastRapport = rapports[0] || null
  const recentRapports = rapports.slice(0, 8)

  if (loading) {
    return (
      <div className="app-shell app-shell--operator">
        <Topbar activeView="operator" onNavigate={onNavigate} />
        <PageLoader label="Chargement de votre espace…" />
      </div>
    )
  }

  return (
    <div className="app-shell app-shell--operator">
      <Topbar activeView="operator" onNavigate={onNavigate} />
      <PageEnter>
        <main className="op-home">
          <WelcomeBanner subtitle="Résumé de votre espace opérateur." />
          {error && (
            <div className="reports-error-panel" role="alert">
              <div className="reports-error-panel-head"><strong>Problème</strong><p>{error}</p></div>
            </div>
          )}

          <section className="op-home-stats" aria-label="Résumé">
            <article className="op-home-stat">
              <span className="op-home-stat-label">Sites suivis</span>
              <strong className="op-home-stat-value">{sites.length}</strong>
              <span className="op-home-stat-hint">Cuves et autonomie</span>
            </article>
            <article className="op-home-stat">
              <span className="op-home-stat-label">Mes relevés</span>
              <strong className="op-home-stat-value">{rapports.length}</strong>
              <span className="op-home-stat-hint">Envois transmis</span>
            </article>
            <article className="op-home-stat">
              <span className="op-home-stat-label">Dernier envoi</span>
              <strong className="op-home-stat-value op-home-stat-value--sm">
                {lastRapport
                  ? `${formatDate(lastRapport.date_debut)} → ${formatDate(lastRapport.date_fin)}`
                  : 'Aucun'}
              </strong>
              <span className="op-home-stat-hint">
                {lastRapport ? `${lastRapport.lignes_count ?? 0} ligne(s)` : 'Aucun relevé pour l’instant'}
              </span>
            </article>
          </section>

          <div className="op-home-columns">
            <section className="op-home-panel">
              <div className="op-home-panel-head">
                <div>
                  <h2>Sites</h2>
                  <p>Aperçu et autonomie.</p>
                </div>
                <button type="button" className="reports-btn reports-btn--ghost" onClick={() => onNavigate('sites')}>
                  Tout voir
                </button>
              </div>
              {sites.length === 0 ? (
                <p className="reports-empty">Aucun site disponible.</p>
              ) : (
                <ul className="op-home-site-list">
                  {sites.map((site) => {
                    const siteAut = autonomyBySite[String(site.id)] || autonomyBySite[site.id] || {}
                    return (
                      <li key={site.id}>
                        <button
                          type="button"
                          className="op-home-site-row"
                          onClick={() => onNavigate({
                            view: 'sites',
                            siteId: site.id,
                            siteName: site.nom,
                            mode: 'details',
                          })}
                        >
                          <span className="op-home-site-icon" aria-hidden="true"><Fuel size={16} /></span>
                          <span className="op-home-site-name">{site.nom}</span>
                          <AutonomyBadge entity={siteAut} size="sm" showLabel={false} />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section className="op-home-panel">
              <div className="op-home-panel-head">
                <div>
                  <h2>Derniers relevés</h2>
                  <p>Vos envois récents.</p>
                </div>
                <button
                  type="button"
                  className="reports-btn reports-btn--ghost"
                  onClick={() => onNavigate({ view: 'reports', pane: 'history' })}
                >
                  Voir les relevés
                </button>
              </div>
              {recentRapports.length === 0 ? (
                <div className="op-home-empty-cta">
                  <p className="reports-empty">Aucun relevé envoyé.</p>
                  <button type="button" className="reports-btn reports-btn--primary" onClick={() => onNavigate('reports')}>
                    Envoyer mon premier relevé
                  </button>
                </div>
              ) : (
                <ul className="op-home-report-list">
                  {recentRapports.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        className="op-home-report-row"
                        onClick={() => onNavigate({ view: 'reports', pane: 'history' })}
                      >
                        <span className="op-home-report-id">n°{r.id}</span>
                        <span className="op-home-report-period">
                          {formatDate(r.date_debut)} → {formatDate(r.date_fin)}
                        </span>
                        <span className="op-home-report-lines">
                          {r.lignes_count ?? 0} ligne{(r.lignes_count ?? 0) > 1 ? 's' : ''}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </main>
      </PageEnter>
    </div>
  )
}

export default OperatorHomePage
