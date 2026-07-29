import React, { useEffect, useMemo, useState } from 'react'
import { MapPinned, UserRound, ArrowRight, Fuel } from 'lucide-react'
import Topbar from '../components/Topbar.jsx'
import WelcomeBanner from '../components/WelcomeBanner.jsx'
import PageEnter from '../components/PageEnter.jsx'
import PageLoader from '../components/PageLoader.jsx'
import AutonomyBadge from '../components/AutonomyBadge.jsx'
import { apiFetch } from '../auth.js'
import { useAuth } from '../context/AuthContext.jsx'
import { getDisplayFullName } from '../utils/userDisplay.js'

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
        <main className="op-home">
          <WelcomeBanner
            title={`Bonjour ${getDisplayFullName(user).split(' ')[0]}`}
            subtitle="Espace consultation : suivez les sites et l’autonomie des cuves. Vous ne déposez pas de relevés."
          />

          {error && (
            <div className="reports-error-panel" role="alert">
              <div className="reports-error-panel-head">
                <strong>Problème</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          <section className="op-home-stats" aria-label="Résumé">
            <article className="op-home-stat">
              <span className="op-home-stat-label">Sites visibles</span>
              <strong className="op-home-stat-value">{sites.length}</strong>
              <span className="op-home-stat-hint">Consultation seule</span>
            </article>
            <article className="op-home-stat">
              <span className="op-home-stat-label">À surveiller</span>
              <strong className="op-home-stat-value">{criticalCount}</strong>
              <span className="op-home-stat-hint">Autonomie &lt; 24 h</span>
            </article>
            <article className="op-home-stat">
              <span className="op-home-stat-label">Votre rôle</span>
              <strong className="op-home-stat-value op-home-stat-value--sm">Utilisateur</strong>
              <span className="op-home-stat-hint">Pas d’envoi de relevé</span>
            </article>
          </section>

          <section className="op-home-actions" aria-label="Accès rapide">
            <button type="button" className="op-home-action op-home-action--sites" onClick={() => onNavigate('sites')}>
              <span className="op-home-action-icon" aria-hidden="true"><MapPinned size={22} /></span>
              <span className="op-home-action-body">
                <span className="op-home-action-title">Consulter les sites</span>
                <span className="op-home-action-text">Volumes, autonomie et détail de chaque cuve principale.</span>
                <span className="op-home-action-cta">Ouvrir les sites <ArrowRight size={16} aria-hidden="true" /></span>
              </span>
            </button>
            <button type="button" className="op-home-action op-home-action--history" onClick={() => onNavigate('profile')}>
              <span className="op-home-action-icon" aria-hidden="true"><UserRound size={22} /></span>
              <span className="op-home-action-body">
                <span className="op-home-action-title">Mon profil</span>
                <span className="op-home-action-text">Modifier vos informations et votre mot de passe.</span>
                <span className="op-home-action-cta">Gérer mon compte <ArrowRight size={16} aria-hidden="true" /></span>
              </span>
            </button>
          </section>

          <section className="op-home-panel">
            <div className="op-home-panel-head">
              <div>
                <h2>Sites</h2>
                <p>Aperçu rapide — cliquez pour le détail.</p>
              </div>
              <button type="button" className="reports-btn reports-btn--ghost" onClick={() => onNavigate('sites')}>
                Tout voir
              </button>
            </div>
            {sites.length === 0 ? (
              <p className="reports-empty">Aucun site disponible pour le moment.</p>
            ) : (
              <ul className="op-home-site-list">
                {sites.slice(0, 8).map((site) => {
                  const siteAut = autonomyBySite[String(site.id)] || autonomyBySite[site.id] || {}
                  return (
                    <li key={site.id}>
                      <button
                        type="button"
                        className="op-home-site-row"
                        onClick={() => onNavigate({ view: 'sites', siteId: site.id, siteName: site.nom, mode: 'details' })}
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
        </main>
      </PageEnter>
    </div>
  )
}

export default UserHomePage
