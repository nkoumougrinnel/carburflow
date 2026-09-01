import React from 'react'
import { pathForView, isModifiedNavigation } from '@/utils/views.js'

function NavLink({
  view,
  href,
  onNavigate,
  className,
  children,
  'aria-current': ariaCurrent,
  ...props
}) {
  const resolvedHref = href || pathForView(view)

  const handleClick = (event) => {
    if (isModifiedNavigation(event)) return
    event.preventDefault()
    if (typeof onNavigate === 'function') onNavigate(view)
  }

  return (
    <a
      href={resolvedHref}
      className={className}
      aria-current={ariaCurrent}
      onClick={handleClick}
      {...props}
    >
      {children}
    </a>
  )
}

export default NavLink
