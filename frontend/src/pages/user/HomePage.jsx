import React, { useEffect, useMemo, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import Topbar from '@/components/Topbar.jsx'
import WelcomeBanner from '@/components/WelcomeBanner.jsx'
import PageEnter from '@/components/PageEnter.jsx'
import PageLoader from '@/components/PageLoader.jsx'
import { apiFetch } from '@/auth.js'
import { StatusBadge } from '@/components/ui/status-badge.jsx'
import { TankGauge } from '@/components/ui/tank-gauge.jsx'

export function ViewerStatusBadge({ statusKey, size = 'sm' }) {
  const config = {
    CRITICAL: { label: 'Critique', variant: 'critical' },
    WARNING: { label: 'À surveiller', variant: 'warning' },
    NORMAL: { label: 'Normal', variant: 'success' },
  }

  const meta = config[statusKey] || config.NORMAL

  return (
    <StatusBadge variant={meta.variant} size={size}>
      {meta.label}
    </StatusBadge>
  )
}

function UserHomePage({ onNavigate }) {
  const [sitesDashboard, setSitesDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  const prioritySites = useMemo(() => {
    return parsedSites
      .filter((s) => s.statusKey === 'CRITICAL' || s.statusKey === 'WARNING')
      .sort((a, b) => a.percent - b.percent)
  }, [parsedSites])

  const totalSitesCount = parsedSites.length
  const normalSitesCount = parsedSites.filter((s) => s.statusKey === 'NORMAL').length
  const watchSitesCount = parsedSites.filter((s) => s.statusKey !== 'NORMAL').length

  const openSiteDetails = (site) => {
    onNavigate?.({
      view: 'sites',
      siteId: site.id,
      siteName: site.nom,
      mode: 'details',
    })
  }

  if (loading) {
    return (
      <div className="app-shell">
        <Topbar activeView="viewer" onNavigate={onNavigate} />
        <PageLoader label="Chargement de l'état de vos sites…" />
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
            subtitle="État de vos sites — Consultez rapidement le niveau de carburant de vos cuves principales."
          />

          {error && (
            <div className="reports-error-panel" role="alert">
              <div className="reports-error-panel-head">
                <strong>Problème de chargement</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* 3 indicateurs simples */}
          <section className="viewer-indicators-grid" aria-label="État général du parc">
            <article className="viewer-indicator-card">
              <span className="viewer-indicator-value">{totalSitesCount}</span>
              <span className="viewer-indicator-label">Sites suivis</span>
              <span className="viewer-indicator-sub">Parc sous surveillance</span>
            </article>

            <article className="viewer-indicator-card viewer-indicator-card--normal">
              <span className="viewer-indicator-value">{normalSitesCount}</span>
              <span className="viewer-indicator-label">Niveau normal</span>
              <span className="viewer-indicator-sub">Cuves ≥ 40%</span>
            </article>

            <article className={`viewer-indicator-card ${watchSitesCount > 0 ? 'viewer-indicator-card--warning' : ''}`}>
              <span className="viewer-indicator-value">{watchSitesCount}</span>
              <span className="viewer-indicator-label">À surveiller</span>
              <span className="viewer-indicator-sub">Cuves faibles ou critiques</span>
            </article>
          </section>

          {/* Sites à surveiller */}
          <section className="viewer-section-panel">
            <div className="viewer-section-header">
              <div>
                <span className="viewer-section-kicker">Attention prioritaire</span>
                <h2>Sites à surveiller</h2>
                <p>Accès prioritaire aux cuves principales nécessitant votre attention.</p>
              </div>
            </div>

            {prioritySites.length === 0 ? (
              <div className="viewer-empty-card">
                <ShieldCheck size={32} className="text-success" />
                <div>
                  <strong>Toutes vos cuves principales ont un niveau normal !</strong>
                  <p>Aucun site ne nécessite d'attention particulière actuellement.</p>
                </div>
              </div>
            ) : (
              <div className="viewer-watch-grid">
                {prioritySites.map((site) => (
                  <article
                    key={site.id}
                    className="viewer-watch-card"
                    onClick={() => openSiteDetails(site)}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openSiteDetails(site)
                      }
                    }}
                  >
                    <div className="viewer-watch-card-head">
                      <div>
                        <h3>{site.nom}</h3>
                        <span className="viewer-cp-tag">Cuve principale · {site.cpIdentifiant}</span>
                      </div>
                      <ViewerStatusBadge statusKey={site.statusKey} size="sm" />
                    </div>

                    <div className="viewer-watch-card-body">
                      <TankGauge
                        variant="vertical"
                        percent={site.percent}
                        currentVolume={site.currentVolume}
                        capacity={site.capacity}
                      />

                      <div className="viewer-watch-card-info">
                        <div className="viewer-watch-percent">{Math.round(site.percent)} %</div>
                        <div className="viewer-watch-volumes">
                          {site.currentVolume.toLocaleString('fr-FR')} L / {site.capacity.toLocaleString('fr-FR')} L
                        </div>
                        <p className="viewer-watch-hint">
                          {site.statusKey === 'CRITICAL'
                            ? 'Réservoir principal très faible, réapprovisionnement urgent.'
                            : 'Niveau en baisse à suivre de près.'}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

        </main>
      </PageEnter>
    </div>
  )
}

export default UserHomePage
