import React from 'react'

/**
 * Unified Select component for consistent dropdowns.
 *
 * @param {Object} props
 * @param {string} props.label - Label for the select.
 * @param {string} props.error - Error message to display.
 * @param {string} props.hint - Helper text to display.
 * @param {string} props.id - HTML id for accessibility.
 * @param {Array<{label: string, value: any}>} props.options - List of options to render.
 */
export function Select({ label, error, hint, id, options = [], ...props }) {
  return (
    <div className="ui-input-group">
      {label && (
        <label htmlFor={id} className="ui-input-label">
          {label}
        </label>
      )}
      <div className="ui-input-wrapper">
        <select
          id={id}
          className={`ui-input ui-select ${error ? 'is-error' : ''}`}
          {...props}
        >
          {options.map((opt, idx) => (
            <option key={opt.value ?? idx} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {error && <span className="ui-input-error">{error}</span>}
      {hint && !error && <span className="ui-input-hint">{hint}</span>}
    </div>
  )
}
