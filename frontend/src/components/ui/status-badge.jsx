import React from 'react'

/**
 * StatusBadge Atom
 *
 * A unified badge for representing status or severity.
 *
 * @param {Object} props
 * @param {string} props.variant - 'critical', 'warning', 'info', 'success', 'neutral'
 * @param {string|number} props.children - Text or number to display
 * @param {string} props.size - 'sm', 'md', 'lg'
 * @param {React.ReactNode} props.icon - Optional icon to display before the text
 */
export function StatusBadge({
  variant = 'neutral',
  children,
  size = 'md',
  icon
}) {
  return (
    <span className={`ui-status-badge ui-status-badge--${variant} ui-status-badge--${size}`}>
      {icon && <span className="ui-status-badge-icon">{icon}</span>}
      {children}
    </span>
  )
}

export default StatusBadge
