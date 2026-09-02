import React from 'react'

/**
 * AnimatedBadge Component
 * 
 * Un badge animé pour les notifications et alertes.
 * 
 * @param {Object} props
 * @param {number} props.count - Nombre d'éléments
 * @param {'danger' | 'primary' | 'warning'} props.variant - Variante de couleur
 * @param {'pulse' | 'bounce'} props.animationType - Type d'animation
 * @param {boolean} props.showBounce - Afficher l'animation bounce
 * @param {React.ReactNode} props.children - Contenu supplémentaire
 */
function AnimatedBadge({ 
  count = 0, 
  variant = 'danger', 
  animationType = 'pulse', 
  showBounce = false,
  children 
}) {
  const countValue = count > 99 ? '99+' : count
  const isAnimating = showBounce || count > 0
  
  return (
    <span 
      className={`topbar-badge ${animationType === 'bounce' ? 'is-bounce' : ''} ${isAnimating ? 'is-pulse' : ''}`}
      role="alert"
      aria-label={`${count} notification${count !== 1 ? 's' : ''}`}
    >
      {countValue}
      {children}
    </span>
  )
}

export default AnimatedBadge