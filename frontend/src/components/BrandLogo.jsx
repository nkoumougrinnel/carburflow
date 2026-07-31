import React from 'react'
import { useTheme } from '../context/ThemeContext.jsx'

/** Nouveau logo iconique (goutte / énergie) — navbar & pastilles */
const logoIcon = '/assets/images/logo-navbar.png'
const logoLight = '/assets/images/clair.jpeg'
const logoDark = '/assets/images/sombre.jpeg'

/**
 * Logo CarburFlow.
 * - icon : pastille navbar (nouveau logo)
 * - full : wordmark clair / sombre selon le thème
 */
function BrandLogo({
  variant = 'icon',
  className = '',
  alt = 'CarburFlow',
}) {
  const { isDark } = useTheme()
  const src = variant === 'full'
    ? (isDark ? logoDark : logoLight)
    : logoIcon

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
