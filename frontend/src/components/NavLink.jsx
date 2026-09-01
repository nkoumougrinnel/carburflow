import React from 'react'
import { NavLink as RouterNavLink } from 'react-router-dom'
import { pathForView, isModifiedNavigation } from '@/utils/views.js'

function NavLink({
  view,
  href,
  className,
  children,
  onClick,
  'aria-current': ariaCurrent,
  ...props
}) {
  const to = href || pathForView(view)

  return (
    <RouterNavLink
      to={to}
      end
      className={className}
      aria-current={ariaCurrent}
      onClick={(event) => {
        if (isModifiedNavigation(event)) return
        onClick?.(event)
      }}
      {...props}
    >
      {children}
    </RouterNavLink>
  )
}

export default NavLink
