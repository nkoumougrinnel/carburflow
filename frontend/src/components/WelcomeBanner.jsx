import React, { useMemo, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useAuth } from '@/context/AuthContext.jsx'
import { getDisplayFirstName } from '@/utils/userDisplay.js'

gsap.registerPlugin(useGSAP)

/** Salutation selon l’heure locale. */
export function greetingForHour(date = new Date()) {
  const h = date.getHours()
  if (h >= 5 && h < 12) return 'Bonjour'
  if (h >= 12 && h < 15) return 'Bon après-midi'
  if (h >= 15 && h < 18) return 'Hello'
  if (h >= 18 && h < 22) return 'Bonsoir'
  return 'Salut'
}

/**
 * Bandeau de bienvenue / contexte de page.
 * - Par défaut : salutation horaire + prénom
 * - Passer title / kicker / subtitle pour personnaliser une page
 * - variant="admin-import" : message responsable (pas de salutation)
 */
function WelcomeBanner({
  variant = 'hello',
  title,
  subtitle,
  kicker,
  className = '',
}) {
  const { user, isAdmin, isOperator } = useAuth()
  const ref = useRef(null)
  const firstName = getDisplayFirstName(user)
  const greet = useMemo(() => greetingForHour(), [])

  useGSAP(() => {
    if (!ref.current) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    gsap.from(ref.current, {
      opacity: 0,
      duration: 0.35,
      ease: 'power1.out',
    })
  }, { scope: ref })

  const isAdminImport = variant === 'admin-import'
  const isCustom = Boolean(title || kicker)
  const heading = title || (
    isAdminImport
      ? 'Espace responsable — relevés des équipes'
      : `${greet} ${firstName} !`
  )
  const sub = subtitle || (
    isAdminImport
      ? 'Téléchargez et suivez les fichiers envoyés par les opérateurs.'
      : isAdmin
        ? 'Voici votre tableau de bord CarburFlow. Tout est prêt pour piloter vos sites.'
        : isOperator
          ? 'Bienvenue dans votre espace opérateur.'
          : 'Bienvenue dans votre espace de consultation.'
  )
  const eyebrow = kicker || (isAdminImport ? 'Relevés · Responsable' : 'CarburFlow')

  return (
    <section
      ref={ref}
      className={`welcome-banner ${isAdminImport ? 'welcome-banner--admin' : ''} ${isCustom ? 'welcome-banner--page' : ''} ${className}`.trim()}
      aria-label={title || 'Bienvenue'}
    >
      <div className="welcome-banner-glow" aria-hidden="true" />
      <div className="welcome-banner-body">
        <p className="welcome-banner-kicker">{eyebrow}</p>
        <h1 className="welcome-banner-title">{heading}</h1>
        <p className="welcome-banner-sub">{sub}</p>
      </div>
    </section>
  )
}

export default WelcomeBanner
