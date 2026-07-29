import React, { useEffect, useMemo, useState } from 'react'
import { History, MapPinned, Upload, ArrowRight, Fuel } from 'lucide-react'
import Topbar from '../components/Topbar.jsx'
import WelcomeBanner from '../components/WelcomeBanner.jsx'
import PageEnter from '../components/PageEnter.jsx'
import PageLoader from '../components/PageLoader.jsx'
import AutonomyBadge from '../components/AutonomyBadge.jsx'
import { apiFetch, listMesRapports } from '../auth.js'
import { formatDate } from '../components/reports/ReportsUi.jsx'

function OperatorHomePage({ onNavigate }) {
  const [sitesDashboard, setSitesDashboard] = useState(null)
  const [rapports, setRapports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
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

  const lastRapport = rapports[0] || null
  const recentRapports = rapports.slice(0, 4)

  const actions = [
    {
      id: 'sites',
      icon: MapPinned,
      title: 'Sites',
      text: 'Consulter les cuves et l’autonomie de chaque site.',
      cta: 'Voir les sites',
      tone: 'sites',
    },
    {
      id: 'reports',
      icon: Upload,
      title: 'Relevé',
      text: 'Générer la fiche de la semaine et déposer votre fichier.',
      cta: 'Envoyer un relevé',
      tone: 'reports',
    },
    {
      id: 'history',
      icon: History,
      title: 'Historique',
      text: 'Retrouver, télécharger ou corriger vos envois passés.',
      cta: 'Ouvrir l’historique',
      tone: 'history',
    },
  ]

  if (loading) {
    return (
      <div className="app-shell">
        <Topbar activeView="operator" onNavigate={onNavigate} />
        <PageLoader label="Chargement de votre espace…" />
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Topbar activeView="operator" onNavigate={onNavigate} />
      <PageEnter>
        <main className="op-home">
          <WelcomeBanner
            subtitle="Voici le résumé de votre espace : sites, relevé de la semaine et historique des envois."
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
              <span className="op-home-stat-label">Sites suivis</span>
              <strong className="op-home-stat-value">{sites.length}</strong>
              <span className="op-home-stat-hint">Cuves principales visibles</span>
            </article>
            <article className="op-home-stat">
              <span className="op-home-stat-label">Mes relevés</span>
              <strong className="op-home-stat-value">{rapports.length}</strong>
              <span className="op-home-stat-hint">Fichiers déjà envoyés</span>
            </article>
            <article className="op-home-stat">
              <span className="op-home-stat-label">Dernier envoi</span>
              <strong className="op-home-stat-value op-home-stat-value--sm">
                {lastRapport
                  ? `${formatDate(lastRapport.date_debut)} → ${formatDate(lastRapport.date_fin)}`
                  : 'Aucun'}
              </strong>
              <span className="op-home-stat-hint">
                {lastRapport ? `Rapport n°${lastRapport.id}` : 'Commencez par un relevé'}
              </span>
            </article>
          </section>

          <section className="op-home-actions" aria-label="Accès rapide">
            {actions.map(({ id, icon: Icon, title, text, cta, tone }) => (
              <button
                key={id}
                type="button"
                className={`op-home-action op-home-action--${tone}`}
                onClick={() => onNavigate(id)}
              >
                <span className="op-home-action-icon" aria-hidden="true">
                  <Icon size={22} />
                </span>
                <span className="op-home-action-body">
                  <span className="op-home-action-title">{title}</span>
                  <span className="op-home-action-text">{text}</span>
                  <span className="op-home-action-cta">
                    {cta}
                    <ArrowRight size={16} aria-hidden="true" />
                  </span>
                </span>
              </button>
            ))}
          </section>

          <div className="op-home-columns">
            <section className="op-home-panel" aria-labelledby="op-sites-title">
              <div className="op-home-panel-head">
                <div>
                  <h2 id="op-sites-title">Sites</h2>
                  <p>Aperçu des cuves principales et de leur autonomie.</p>
                </div>
                <button type="button" className="reports-btn reports-btn--ghost" onClick={() => onNavigate('sites')}>
                  Tout voir
                </button>
              </div>

              {sites.length === 0 ? (
                <p className="reports-empty">Aucun site disponible pour le moment.</p>
              ) : (
                <ul className="op-home-site-list">
                  {sites.slice(0, 6).map((site) => {
                    const siteAut = autonomyBySite[String(site.id)] || autonomyBySite[site.id] || {}
                    return (
                      <li key={site.id}>
                        <button
                          type="button"
                          className="op-home-site-row"
                          onClick={() => onNavigate({ view: 'sites', siteId: site.id, siteName: site.nom, mode: 'details' })}
                        >
                          <span className="op-home-site-icon" aria-hidden="true">
                            <Fuel size={16} />
                          </span>
                          <span className="op-home-site-name">{site.nom}</span>
                          <AutonomyBadge entity={siteAut} size="sm" showLabel={false} />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section className="op-home-panel" aria-labelledby="op-history-title">
              <div className="op-home-panel-head">
                <div>
                  <h2 id="op-history-title">Derniers relevés</h2>
                  <p>Vos envois les plus récents.</p>
                </div>
                <button type="button" className="reports-btn reports-btn--ghost" onClick={() => onNavigate('history')}>
                  Historique
                </button>
              </div>

              {recentRapports.length === 0 ? (
                <div className="op-home-empty-cta">
                  <p className="reports-empty">Aucun relevé envoyé pour l’instant.</p>
                  <button
                    type="button"
                    className="reports-btn reports-btn--primary"
                    onClick={() => onNavigate('reports')}
                  >
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
                        onClick={() => onNavigate('history')}
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
