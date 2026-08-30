import React from 'react'
import { Button } from './button.jsx'

/**
 * Unified EmptyState component for consistent "no data" messages.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Icon or illustration to display.
 * @param {string} props.title - Main heading for the empty state.
 * @param {string} props.description - Supporting text.
 * @param {Object} props.action - Optional action to take.
 * @param {string} props.action.label - Button text.
 * @param {Function} props.action.onClick - Button handler.
 * @param {string} [props.action.variant] - Button variant (primary, secondary, etc.).
 * @param {React.ReactNode} [props.action.icon] - Optional icon for the button.
 */
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="ui-empty-state">
      {icon && <div className="ui-empty-state-icon">{icon}</div>}
      <h3 className="ui-empty-state-title">{title}</h3>
      {description && <p className="ui-empty-state-desc">{description}</p>}
      {action && (
        <div className="ui-empty-state-action">
          <Button
            variant={action.variant || 'primary'}
            onClick={action.onClick}
          >
            {action.icon && <span className="btn-icon">{action.icon}</span>}
            {action.label}
          </Button>
        </div>
      )}
    </div>
  )
}
