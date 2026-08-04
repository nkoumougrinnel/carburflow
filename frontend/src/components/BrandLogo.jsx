import React from 'react'
import { useTheme } from '../context/ThemeContext.jsx'

/** Icône goutte — deux versions selon le thème */
const logoIconLight = '/assets/images/logo-navbar-light.jpg'
const logoIconDark  = '/assets/images/logo-navbar-dark.jpg'

/** Wordmark complet — deux versions selon le thème */
const logoLight = '/assets/images/clair.jpeg'
const logoDark  = '/assets/images/sombre.jpeg'

/**
 * Logo CarburFlow.
 * - icon : icône goutte, bascule entre clair et sombre selon le thème
 * - full : wordmark complet clair / sombre selon le thème
 */
function BrandLogo({
  variant = 'icon',
  className = '',
  alt = 'CarburFlow',
}) {
  const { isDark } = useTheme()

  const src = variant === 'full'
    ? (isDark ? logoDark : logoLight)
    : (isDark ? logoIconDark : logoIconLight)

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
