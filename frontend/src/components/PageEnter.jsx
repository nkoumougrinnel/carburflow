import React from 'react'
import FadeContent from './reactbits/FadeContent.jsx'

/**
 * Entrée de page légère (opacity only) pour éviter les reflows / charts qui « dansent ».
 */
function PageEnter({ children, className = '', delay = 0.04 }) {
  return (
    <FadeContent
      blur={false}
      duration={420}
      delay={delay * 1000}
      threshold={0.01}
      className={`page-enter-root ${className}`.trim()}
    >
      {children}
    </FadeContent>
  )
}

export default PageEnter
