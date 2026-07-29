import React from 'react'
import { useTheme } from '../context/ThemeContext.jsx'

const logoIcon = '/assets/images/logo_clair_navbar.jpeg'
const logoLight = '/assets/images/clair.jpeg'
const logoDark = '/assets/images/sombre.jpeg'

/**
 * Logo CarburFlow officiel (frontend/public/assets/images).
 * - icon : pastille navbar
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
