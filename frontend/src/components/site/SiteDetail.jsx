import React from 'react'
import { ArrowLeft } from 'lucide-react'
import { TankGauge } from '@/components/ui/tank-gauge.jsx'

/**
 * Visual gauge à gauche pour la cuve principale.
 * Réutilisé par les 3 rôles pour garantir le même langage visuel.
 */
export function SiteMainTank({ percent }) {
  return (
    <div className="site-main-tank-wrap">
      <TankGauge variant="vertical" size="lg" percent={percent} />
      <div className="site-main-tank-percent">
        <strong>{Math.round(percent)} %</strong>
        <span className="site-main-tank-fraction">remplissage</span>
      </div>
    </div>
  )
}

/**
 * Une carte métrique individuelle. Réutilisée pour les 4 métriques principales.
 */
export function SiteMetricCard({ label, value, emphasis = false }) {
  return (
    <article className={`site-main-metric-card${emphasis ? ' site-main-metric-card--emphasis' : ''}`}>
      <span className="site-main-metric-label">{label}</span>
      <strong className="site-main-metric-value">{value}</strong>
    </article>
  )
}

/**
 * Bloc commun : cuve principale à gauche + 4 métriques à droite.
 * Niveau 1 = exactement ce bloc. Niveaux 2 et 3 l'ajoutent à leurs blocs supplémentaires.
 */
export function SiteMainTankBlock({ site }) {
  const volumeDisponible = Math.max(0, site.capacity - site.currentVolume)
  return (
    <div className="site-main-tank-block">
      <SiteMainTank percent={site.percent} />
      <div className="site-main-metrics-grid">
        <SiteMetricCard
          label="Niveau actuel"
          value={`${site.currentVolume.toLocaleString('fr-FR')} L`}
        />
        <SiteMetricCard
          label="Pourcentage"
          value={`${Math.round(site.percent)} %`}
        />
        <SiteMetricCard
          label="Capacité"
          value={`${site.capacity.toLocaleString('fr-FR')} L`}
        />
        <SiteMetricCard
          label="Disponible"
          value={`${volumeDisponible.toLocaleString('fr-FR')} L`}
        />
      </div>
    </div>
  )
}

/**
 * En-tête commun du site (même style pour les 3 rôles).
 * Le titre principal et le sous-titre sont identiques partout.
 * Le badge à droite est facultatif (statut / autonomie selon le rôle).
 */
export function SiteDetailHeader({ site, kicker = 'Sites', rightSlot = null, subtitle = null }) {
  return (
    <div className="site-detail-header">
      <div className="site-detail-header-text">
        <span className="metric-label">{kicker}</span>
        <h2>{site.nom}</h2>
        {subtitle ? <p className="site-detail-header-sub">{subtitle}</p> : null}
      </div>
      {rightSlot ? <div className="site-detail-header-right">{rightSlot}</div> : null}
    </div>
  )
}

/**
 * Bouton retour discret, réutilisé par les 3 rôles.
 */
export function SiteDetailBack({ onBack, label = 'Sites' }) {
  return (
    <button
      type="button"
      className="site-btn-back"
      onClick={onBack}
    >
      <ArrowLeft size={15} />
      <span>Retour à {label}</span>
    </button>
  )
}

/**
 * Enveloppe commune des pages détail site.
 * Fournit la même structure, le même padding, les mêmes espacements
 * pour les 3 rôles. Seuls les enfants changent.
 */
export function SiteDetailLayout({ children }) {
  return <div className="site-detail-layout">{children}</div>
}