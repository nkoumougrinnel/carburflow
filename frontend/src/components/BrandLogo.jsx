import React from 'react'
import { useTheme } from '@/context/ThemeContext.jsx'

/** Icône goutte — deux versions selon le thème (assets présents dans public/assets/images/) */
const logoIconLight = '/assets/images/logo-navbar-light.jpg'
const logoIconDark  = '/assets/images/logo-navbar-dark.jpg'

/**
 * Logo CarburFlow.
 * - icon : icône goutte, bascule entre clair et sombre selon le thème
 * - full : wordmark complet (fallback sur l'icône faute d'asset dédié)
 *
 * Note : à défaut de wordmark dédié (clair.jpeg / sombre.jpeg) dans
 * public/assets/images/, on réutilise l'icône pour les deux variantes.
 * Pour activer un vrai wordmark, déposer `logo-full-light.svg` /
 * `logo-full-dark.svg` dans public/assets/images/ et remplacer les
 * deux lignes ci-dessous.
 */
function BrandLogo({
  variant = 'icon',
  className = '',
  alt = 'CarburFlow',
}) {
  const { isDark } = useTheme()
  const src = isDark ? logoIconDark : logoIconLight

  return (
    <img
      src={src}
      alt={alt}
      className={`brand-logo brand-logo--${variant} ${className}`.trim()}
      draggable={false}
    />
  )
}

export default BrandLogo
