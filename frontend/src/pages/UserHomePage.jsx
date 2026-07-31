import React, { useEffect, useMemo, useState } from 'react'
import { Fuel } from 'lucide-react'
import Topbar from '../components/Topbar.jsx'
import WelcomeBanner from '../components/WelcomeBanner.jsx'
import PageEnter from '../components/PageEnter.jsx'
import PageLoader from '../components/PageLoader.jsx'
import AutonomyBadge from '../components/AutonomyBadge.jsx'
import { apiFetch } from '../auth.js'
import { useAuth } from '../context/AuthContext.jsx'
import { getDisplayFirstName } from '../utils/userDisplay.js'

function UserHomePage({ onNavigate }) {
  const { user } = useAuth()
  const [sitesDashboard, setSitesDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const sites = await apiFetch('/api/v1/dashboard/sites')
        if (!cancelled) setSitesDashboard(sites)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Impossible de charger les sites.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const sites = useMemo(() => {
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
  const criticalCount = sites.filter((site) => {
    const entity = autonomyBySite[String(site.id)] || autonomyBySite[site.id] || {}
    if (entity.is_infinite_consumption || entity.is_infinite_autonomy || entity.is_sans_fonctionnement) {
      return false
    }
    const hrs = entity.autonomie_hours
    return hrs != null && Number(hrs) < 24
  }).length

  if (loading) {
    return (
      <div className="app-shell">
        <Topbar activeView="viewer" onNavigate={onNavigate} />
        <PageLoader label="Chargement de votre espace…" />
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Topbar activeView="viewer" onNavigate={onNavigate} />
      <PageEnter>
        <main className="user-home">
          <WelcomeBanner
            kicker="Espace consultation"
            title={`Bonjour ${getDisplayFirstName(user)}`}
            subtitle="Suivez l’autonomie de vos sites. Vous consultez uniquement — pas d’envoi de relevés."
          />

          {error && (
            <div className="reports-error-panel" role="alert">
              <div className="reports-error-panel-head">
                <strong>Problème</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          <section className="user-home-stats" aria-label="Résumé">
            <article className="user-home-stat">
              <span className="user-home-stat-label">Sites visibles</span>
              <strong className="user-home-stat-value">{sites.length}</strong>
              <span className="user-home-stat-hint">Consultation seule</span>
            </article>
            <article className="user-home-stat">
              <span className="user-home-stat-label">À surveiller</span>
              <strong className={`user-home-stat-value${criticalCount > 0 ? ' is-urgent' : ''}`}>
                {criticalCount}
              </strong>
              <span className="user-home-stat-hint">Autonomie &lt; 24 h</span>
            </article>
            <article className="user-home-stat">
              <span className="user-home-stat-label">Votre rôle</span>
              <strong className="user-home-stat-value user-home-stat-value--sm">Consultation</strong>
              <span className="user-home-stat-hint">Pas d’envoi de relevé</span>
            </article>
          </section>

          <section className="user-home-panel">
            <div className="user-home-panel-head">
              <div>
                <h2>Sites</h2>
                <p>Aperçu de l’autonomie — ouvrez un site pour le détail.</p>
              </div>
            </div>
            {sites.length === 0 ? (
              <p className="reports-empty">Aucun site disponible pour le moment.</p>
            ) : (
              <ul className="user-home-site-list">
                {sites.map((site) => {
                  const siteAut = autonomyBySite[String(site.id)] || autonomyBySite[site.id] || {}
                  return (
                    <li key={site.id}>
                      <button
                        type="button"
                        className="user-home-site-row"
                        onClick={() => onNavigate({
                          view: 'sites',
                          siteId: site.id,
                          siteName: site.nom,
                          mode: 'details',
                        })}
                      >
                        <span className="user-home-site-icon" aria-hidden="true">
                          <Fuel size={16} />
                        </span>
                        <span className="user-home-site-name">{site.nom}</span>
                        <AutonomyBadge entity={siteAut} size="sm" showLabel={false} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </main>
      </PageEnter>
    </div>
  )
}

export default UserHomePage
